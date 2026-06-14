import { rm, writeFile } from 'fs/promises'
import { serverProperties } from './fileModels/server.properties'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
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
const vanillaVersion = '26.1.2'
const whitelistPath = sdk.volumes.main.subpath('whitelist.json')

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

  // store.json is package-internal — only our actions write to it, so .const()
  // gives us automatic restart-on-change.
  //
  // server.properties is also written by Minecraft itself (the image truncates
  // and rewrites on every load via Java's FileOutputStream), which produces
  // a transient empty-file state where rcon.password parses back to the
  // schema's '' catch fallback — different from the real value — and would
  // trip .const() before RCON is ready. So we read it .once() and let the
  // narrow set of actions that mutate only server.properties (createWorld,
  // selectWorld) call effects.restart() explicitly.
  const store = await storeJson.read().const(effects)
  if (!store) {
    throw new Error('no store.json')
  }

  const props = await serverProperties.read().once()
  if (!props) {
    throw new Error('no server.properties')
  }

  // Keep whitelist.json in sync with the configured player list.
  if (props['white-list']) {
    await writeFile(whitelistPath, JSON.stringify(store.whitelist, null, 2))
  } else {
    await rm(whitelistPath, { force: true })
  }

  const rconProxySub = await sdk.SubContainer.of(
    effects,
    { imageId: 'rcon-proxy' },
    null,
    'rcon-proxy-sub',
  )

  await writeFile(
    `${rconProxySub.rootfs}/etc/nginx/conf.d/default.conf`,
    proxyConfig({
      proxyPort: webAdminProxyPort,
      upstreamPort: webAdminPort,
      websocketPort: webAdminWsPort,
    }),
  )

  const isModded = store.modLoader !== 'vanilla'
  const minecraftImageId = isModded
    ? 'minecraft-server-java21'
    : 'minecraft-server'

  const minecraftEnv: Record<string, string> = {
    EULA: 'TRUE',
    TYPE: { vanilla: 'VANILLA', neoforge: 'NEOFORGE', fabric: 'FABRIC' }[
      store.modLoader
    ],
    // Vanilla is pinned to the package's shipped version; modded versions are
    // user-selected (must be within the java21 image's supported range).
    VERSION: isModded ? store.modMinecraftVersion : vanillaVersion,
    INIT_MEMORY: store.memory.initial,
    MAX_MEMORY: store.memory.maximum,
    // We manage server.properties directly via the serverProperties
    // FileHelper; tell the image not to regenerate it from env vars.
    SKIP_SERVER_PROPERTIES: 'TRUE',
  }
  if (isModded && store.mods.length > 0) {
    // itzg auto-downloads these Modrinth projects (and their required deps)
    // into /data/mods on top of the installed loader.
    minecraftEnv.MODRINTH_PROJECTS = store.mods.join(',')
    minecraftEnv.MODRINTH_DOWNLOAD_DEPENDENCIES = 'required'
  }

  return sdk.Daemons.of(effects)
    .addDaemon('minecraft-server', {
      subcontainer: await sdk.SubContainer.of(
        effects,
        { imageId: minecraftImageId },
        sdk.Mounts.of().mountVolume({
          volumeId: 'main',
          subpath: null,
          mountpoint: '/data',
          readonly: false,
        }),
        'minecraft-server-sub',
      ),
      exec: {
        command: sdk.useEntrypoint(),
        env: minecraftEnv,
      },
      ready: {
        display: i18n('Minecraft Server'),
        gracePeriod: isModded
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
      requires: [],
    })
    .addDaemon('rcon-admin', {
      subcontainer: await sdk.SubContainer.of(
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
