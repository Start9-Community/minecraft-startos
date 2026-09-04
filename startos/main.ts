import { writeFile } from 'fs/promises'
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
// A modpack first boot does everything a modded one does and more: fetch or
// read the pack, install the loader build it names, then write every mod,
// config and override it carries. A large pack on a slow link legitimately
// takes longer than the modded allowance, and a health check that goes red
// mid-install invites someone to "fix" a server that is working.
const modpackHealthGracePeriod = 900_000
const vanillaVersion = '26.2'

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
  const minecraftImageId = isModded
    ? 'minecraft-server-java21'
    : 'minecraft-server'

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
  if (isModpack) {
    // A modpack declares its own Minecraft version *and* loader build in the
    // pack's `dependencies`, and the image installs both. So VERSION is left
    // unset here deliberately: setting it would narrow which pack version is
    // resolved, and for a direct .mrpack would simply conflict with the pack.
    //
    // This is also the only path on which the loader build is pinned. The
    // per-mod path leaves NEOFORGE_VERSION at its default of `latest`, so the
    // server drifts onto a newer build on restart while clients keep the one
    // their modpack names -- see issue #7.
    minecraftEnv.MODRINTH_MODPACK = store.modpack.source
    if (store.modpack.forceResync) {
      // Only consulted on the Modrinth-API path (slug/project); the direct-URL
      // path ignores it, which is why the cached pack is cleared as well below.
      minecraftEnv.MODRINTH_FORCE_SYNCHRONIZE = 'TRUE'
    }
    if (store.modpack.excludeFiles) {
      // For packs that mark a client-only mod as server-compatible; without
      // this the server crashes on start naming that mod.
      minecraftEnv.MODRINTH_EXCLUDE_FILES = store.modpack.excludeFiles
    }
  } else {
    // Vanilla is pinned to the package's shipped version; modded versions are
    // user-selected (must be within the java21 image's supported range).
    minecraftEnv.VERSION = isModded ? store.modMinecraftVersion : vanillaVersion
  }

  if (isModded && !isModpack && store.mods.length > 0) {
    // itzg auto-downloads these Modrinth projects (and their required deps)
    // into /data/mods on top of the installed loader. A mod may pin a version,
    // version ID, or channel via `slug:version` (e.g. `jei:beta`).
    minecraftEnv.MODRINTH_PROJECTS = store.mods
      .map((mod) => (mod.version ? `${mod.slug}:${mod.version}` : mod.slug))
      .join(',')
    minecraftEnv.MODRINTH_DOWNLOAD_DEPENDENCIES = 'required'
  }

  /**
   * Clear the cached modpack when a re-sync is asked for.
   *
   * A URL-sourced pack is identified by the URL itself -- the image base64s it
   * into a version id -- so re-publishing an edited pack at the same address
   * looks unchanged and the whole install step is skipped. That also means
   * `MODRINTH_EXCLUDE_FILES` is never evaluated, which is a confusing way to
   * discover this: the exclusion appears to be ignored when in fact nothing ran.
   *
   * `MODRINTH_FORCE_SYNCHRONIZE` does not cover this. It is only passed to the
   * Modrinth-API fetcher (slug or project id); the direct-URL fetcher never
   * receives it. Removing the cached pack and its manifest is what forces a
   * genuine re-fetch, so both are done together.
   *
   * The oneshot is always present, and is a no-op unless a re-sync is
   * requested, so the daemon graph keeps one shape.
   */
  const resyncCommand =
    isModpack && store.modpack.forceResync
      ? [
          // The cached pack and its manifest: without removing these, a pack
          // re-published at the same URL is treated as already installed.
          'rm -f /data/modpack.mrpack /data/.modrinth-modpack-manifest.json /data/.install-modrinth.env',
          // And the mods themselves. The installer only ever *adds*: a jar left
          // behind by a previously applied pack is never cleaned up, so a mod
          // the current pack does not contain keeps loading -- and a client-only
          // one crashes the server on every start with a mixin error naming a
          // mod you can no longer find in your pack. Synchronising means the
          // directory ends up matching the pack, which means emptying it first.
          'rm -rf /data/mods',
        ].join(' && ')
      : 'true'

  return sdk.Daemons.of(effects)
    .addOneshot('modpack-cache', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: minecraftImageId },
        sdk.Mounts.of().mountVolume({
          volumeId: 'main',
          subpath: null,
          mountpoint: '/data',
          readonly: false,
        }),
        'modpack-cache-sub',
      ),
      exec: { command: ['sh', '-c', resyncCommand] },
      requires: [],
    })
    .addDaemon('minecraft-server', {
      subcontainer: sdk.SubContainer.of(
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
      requires: ['modpack-cache'],
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
