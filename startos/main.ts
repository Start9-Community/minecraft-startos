import { rm, writeFile } from 'node:fs/promises'
import { serverProperties } from './fileModels/server.properties'
import {
  type JavaVersion,
  storeJson,
  uploadedModpackPath,
} from './fileModels/store.json'
import { i18n } from './i18n'
import { removeTrackedMods } from './modpacks'
import { sdk } from './sdk'
import {
  gamePort,
  rconPort,
  webAdminPort,
  webAdminProxyPort,
  webAdminWsPort,
} from './utils'

// Must match the rcon-web-admin version in the FROM line of rcon.Dockerfile.
// The image installs to /opt/rcon-web-admin-<version>/, and we mount a
// volume subpath onto its /db directory for persistence.
const rconWebAdminDbPath = '/opt/rcon-web-admin-0.14.1/db'
const minecraftHealthGracePeriod = 30_000
// Modded first boot installs the loader and downloads mods before the port
// opens, so it needs a much longer grace before health failures count.
const moddedHealthGracePeriod = 300_000
const modpackHealthGracePeriod = 900_000
const vanillaVersion = '26.2'
const bundledJavaVersion: JavaVersion = 'java25'

const proxyConfig = ({
  proxyPort,
  upstreamPort,
  websocketPort,
}: {
  proxyPort: number
  upstreamPort: number
  websocketPort: number
}) =>
  `
server {
  listen ${proxyPort};
  server_name _;

  location = /wsconfig {
    default_type application/json;
    return 200 '{"port":${websocketPort},"sslUrl":"wss://$http_host/ws","url":"ws://$http_host/ws"}';
  }

  location = /ws {
    proxy_pass http://127.0.0.1:${websocketPort}/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_host;
    proxy_buffering off;
  }

  location /ws/ {
    proxy_pass http://127.0.0.1:${websocketPort}/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_host;
    proxy_buffering off;
  }

  location / {
    proxy_pass http://127.0.0.1:${upstreamPort};
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
`.trimStart()

export const main = sdk.setupMain(async ({ effects }) => {
  console.log('Starting Minecraft!')

  const store = await storeJson.read().const(effects)
  if (!store) {
    throw new Error('no store.json')
  }

  // Watching transiently empty `server.properties` causes premature restarts.
  const props = await serverProperties.read().once()
  if (!props) {
    throw new Error('no server.properties')
  }

  const rconProxySub = sdk.SubContainer.of(
    effects,
    { imageId: 'rcon-proxy' },
    null,
    'rcon-proxy-sub',
  )

  const rconProxyRootfs = await rconProxySub.rootfs
  await writeFile(
    `${rconProxyRootfs}/etc/nginx/conf.d/default.conf`,
    proxyConfig({
      proxyPort: webAdminProxyPort,
      upstreamPort: webAdminPort,
      websocketPort: webAdminWsPort,
    }),
  )

  const isModpack = store.modLoader === 'modpack'
  const isModded = store.modLoader !== 'vanilla'

  const minecraftSub = sdk.SubContainer.of(
    effects,
    { imageId: 'minecraft-server' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      })
      .mountAssets({ subpath: null, mountpoint: '/start9' }),
    'minecraft-server-sub',
  )

  const jre =
    isModded && store.javaVersion !== bundledJavaVersion
      ? `/data/start9/jre/${store.javaVersion}`
      : undefined

  if (isModpack) {
    await removeTrackedMods('.modrinth-manifest.json')
  } else if (isModded) {
    await removeTrackedMods('.modrinth-modpack-manifest.json')
  } else {
    await removeTrackedMods('.modrinth-manifest.json')
    await removeTrackedMods('.modrinth-modpack-manifest.json')
  }

  const minecraftEnv: Record<string, string> = {
    EULA: 'TRUE',
    TYPE: {
      vanilla: 'VANILLA',
      neoforge: 'NEOFORGE',
      fabric: 'FABRIC',
      modpack: 'MODRINTH',
    }[store.modLoader],
    INIT_MEMORY: store.memory.initial,
    MAX_MEMORY: store.memory.maximum,
    // Hand the image our managed RCON password so mc-server-runner can stop the
    // server over RCON on restart. Without it, RCON stop fails auth; vanilla
    // falls back to writing `stop` to the console, but modded servers run under
    // a run.sh wrapper where that also fails, so the JVM is SIGKILLed after the
    // termination grace instead of saving and exiting cleanly.
    RCON_PASSWORD: props['rcon.password'],
    // We manage server.properties directly via the serverProperties
    // FileHelper; tell the image not to regenerate it from env vars.
    SKIP_SERVER_PROPERTIES: 'TRUE',
  }
  if (jre) {
    // mc-image-helper keeps the image's Java through JAVA_HOME; the server takes `java` from PATH.
    minecraftEnv.PATH = `${jre}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`
  }
  if (isModpack) {
    // Omitting VERSION leaves Modrinth project resolution unfiltered.
    minecraftEnv.MODRINTH_MODPACK = store.modpack.source
    minecraftEnv.MODRINTH_OVERRIDES_EXCLUSIONS = 'server.properties,start9/**'
    minecraftEnv.MODRINTH_EXCLUDE_FILES = [
      'server.properties',
      'start9/',
      store.modpack.excludeFiles,
    ]
      .filter(Boolean)
      .join(',')
    if (store.modpack.forceResync) {
      minecraftEnv.MODRINTH_FORCE_SYNCHRONIZE = 'TRUE'
    }
  } else {
    minecraftEnv.VERSION = isModded ? store.modMinecraftVersion : vanillaVersion
  }

  if (isModded && !isModpack) {
    minecraftEnv.MODRINTH_PROJECTS = store.mods
      .map((mod) => (mod.version ? `${mod.slug}:${mod.version}` : mod.slug))
      .join(',')
    minecraftEnv.MODRINTH_DOWNLOAD_DEPENDENCIES = 'required'
  }

  if (
    isModpack &&
    store.modpack.forceResync &&
    store.modpack.source !== uploadedModpackPath
  ) {
    // Direct URL caches bypass MODRINTH_FORCE_SYNCHRONIZE.
    await rm(sdk.volumes.main.subpath('modpack.mrpack'), { force: true })
  }

  return sdk.Daemons.of(effects)
    .addOneshot('ensure-jre', () =>
      jre
        ? {
            subcontainer: minecraftSub,
            exec: {
              command: [
                'bash',
                '/start9/ensure-jre.sh',
                store.javaVersion.slice(4),
                jre,
              ],
            },
            requires: [],
          }
        : null,
    )
    .addDaemon('minecraft-server', {
      subcontainer: minecraftSub,
      exec: {
        command: sdk.useEntrypoint(),
        env: minecraftEnv,
      },
      ready: {
        display: i18n('Minecraft Server'),
        gracePeriod: isModpack
          ? modpackHealthGracePeriod
          : isModded
            ? moddedHealthGracePeriod
            : minecraftHealthGracePeriod,
        fn: async () => {
          const minecraftStatus = await sdk.healthCheck.checkPortListening(
            effects,
            gamePort,
            {
              successMessage: i18n('Minecraft server is ready'),
              errorMessage: i18n('Minecraft server is not ready'),
            },
          )

          if (minecraftStatus.result !== 'success') {
            return minecraftStatus
          }

          return sdk.healthCheck.checkPortListening(effects, rconPort, {
            successMessage: i18n('Minecraft server is ready'),
            errorMessage: i18n('Minecraft server is ready, waiting for RCON'),
          })
        },
      },
      requires: jre ? ['ensure-jre'] : [],
    })
    .addDaemon('rcon-admin', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'rcon' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'main',
          subpath: 'rcon-db',
          mountpoint: rconWebAdminDbPath,
          readonly: false,
        }),
        'rcon-sub',
      ),
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          RWA_USERNAME: store.webAdminUsername,
          RWA_PASSWORD: store.webAdminPassword,
          RWA_ADMIN: 'TRUE',
          RWA_RCON_HOST: 'localhost',
          RWA_RCON_PORT: rconPort.toString(),
          RWA_RCON_PASSWORD: props['rcon.password'],
        },
      },
      ready: {
        display: i18n('RCON Web Admin'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, webAdminPort, {
            successMessage: i18n('Web admin is ready'),
            errorMessage: i18n('Web admin is not ready'),
          }),
      },
      requires: ['minecraft-server'],
    })
    .addDaemon('rcon-proxy', {
      subcontainer: rconProxySub,
      exec: {
        command: sdk.useEntrypoint(),
      },
      ready: {
        display: i18n('RCON Web Admin Proxy'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, webAdminProxyPort, {
            successMessage: i18n('Web admin proxy is ready'),
            errorMessage: i18n('Web admin proxy is not ready'),
          }),
      },
      requires: ['rcon-admin'],
    })
})
