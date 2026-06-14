<p align="center">
  <img src="icon.png" alt="Minecraft Server Logo" width="21%">
</p>

# Minecraft Server on StartOS

> **Upstream docs:** <https://docker-minecraft-server.readthedocs.io/>
>
> Everything not listed in this document should behave the same as upstream
> `itzg/minecraft-server`. If a feature, setting, or behavior is not mentioned
> here, upstream documentation is accurate and applicable.

StartOS package for a vanilla Minecraft Java Edition server with a bundled RCON
Web Admin experience.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Image | Role | Source |
| --- | --- | --- |
| `minecraft-server` | Vanilla Minecraft Java Edition server (Java 25) | Upstream Docker image (`itzg/minecraft-server:java25`), pinned by digest in `startos/manifest/index.ts` |
| `minecraft-server-java21` | Minecraft server for modded loaders (NeoForge/Fabric), which require Java 21 | Upstream Docker image (`itzg/minecraft-server:java21`), pinned by digest in `startos/manifest/index.ts` |
| `rcon` | RCON Web Admin sidecar | Built from `rcon.Dockerfile` (extends upstream `itzg/rcon`, applies patches in `docker/rcon/`) |
| `rcon-proxy` | nginx reverse proxy in front of the RCON Web Admin UI and websocket | Upstream `nginx:alpine` |

| Property | Value |
| --- | --- |
| Architectures | x86_64, aarch64 |
| Entry command | Upstream entrypoint (`sdk.useEntrypoint()`) for all three containers |

---

## Volume and Data Layout

The package uses a single volume, `main`, with two distinct subpaths:

| Subpath in `main` volume | Container mount point | Purpose |
| --- | --- | --- |
| (volume root) | `/data` (minecraft container) | World saves, server files, StartOS-managed files |
| `rcon-db/` | `/opt/rcon-web-admin-<version>/db` (rcon container) | RCON Web Admin SQLite DB and session state |

StartOS-managed files at the `main` volume root:
- `server.properties` — canonical Minecraft server config; written by the package's actions and read directly by the daemon
- `start9/store.json` — package-internal state (memory profile, mod loader/version/mods, Web Admin credentials)
- `whitelist.json` — owned by the Minecraft server; (re)written by the server when the **Manage Whitelist** action issues `whitelist` commands over RCON

---

## Installation and First-Run Flow

On first install, the package:
1. Seeds `server.properties` with sane defaults and generates a strong random RCON password (used internally by the Web Admin sidecar).
2. Creates one onboarding task:
   - **critical**: Set Web Admin Password — runs the action to generate a random Web Admin password and display it once. The service cannot start until this has been done.

All gameplay defaults (memory, difficulty, world name, etc.) are sane out of the box. Run **Configure Server** or the **Worlds** actions only if you want to change them.

---

## Configuration Management

Gameplay/server settings are managed by writing directly to
`server.properties` via StartOS actions. Memory profile, mod loader
settings, and the Web Admin credentials live in `start9/store.json` (no
equivalent Minecraft config field exists for them). The whitelist is owned
by the Minecraft server and managed via the **Manage Whitelist** action over
RCON, so the server assigns each player's mode-correct UUID.

The image is run with `SKIP_SERVER_PROPERTIES=true` so it does not
regenerate `server.properties` from environment variables. Hand-edits to
keys the package does not model (`function-permission-level`,
`network-compression-threshold`, etc.) are preserved across action runs.

Mutating actions (configure server, set Web Admin password, manage
whitelist, world create/select) trigger an automatic restart so the new
state is applied to the running server.

The world seed is set per-world via the **Create World** action — it is not
exposed in the global **Configure Server** form, since changing it on a
populated world has no effect.

The **Mod Loader** action selects vanilla (default), NeoForge, or Fabric and
persists the choice — plus Minecraft version and a list of Modrinth project
slugs — in `start9/store.json`. Vanilla runs on the `minecraft-server` image;
NeoForge/Fabric run on the `minecraft-server-java21` image. When a modded
loader is selected, `main.ts` sets `TYPE`/`VERSION` accordingly and installs
mods via `MODRINTH_PROJECTS` (with `MODRINTH_DOWNLOAD_DEPENDENCIES=required`).

---

## Network Access and Interfaces

| Interface ID | Port | Protocol | Purpose |
| --- | --- | --- | --- |
| `minecraft-server` | 25565 | TCP | Minecraft Java Edition client connections |
| `web-admin` | 8080 | HTTP | RCON Web Admin UI (proxied) |

Choose your preferred connection address from the **Interfaces** page in StartOS.

Internal-only service ports:
- `25575` RCON endpoint (used by sidecars/actions)
- `4326` RCON Web Admin service
- `4327` RCON Web Admin websocket backend

---

## Actions (StartOS UI)

| Action ID | Purpose | Availability |
| --- | --- | --- |
| `configure-server` | Configure gameplay/server settings | any |
| `mod-loader` | Select vanilla/NeoForge/Fabric and install Modrinth mods | any |
| `list-worlds` | Inspect saved worlds and metadata | any |
| `create-world` | Stage a new world name/seed | any |
| `select-world` | Switch active world | any |
| `delete-world` | Permanently delete a world save | only-stopped |
| `set-web-admin-password` | Generate a random Web Admin password and display it once (required on install) | any |
| `get-server-info` | Show active server settings and Web Admin username | only-running |
| `get-live-server-stats` | Query live stats via RCON | only-running |
| `manage-whitelist` | View, add, remove, and enable the whitelist (over RCON) | only-running |

---

## Backups and Restore

**Included in backup:**
- `main` volume

**Pre-backup behavior:**
- If the server is running, package issues `save-all flush` over RCON before
  snapshot creation.

**Restore behavior:**
- Standard StartOS restore flow is used (`restoreInit`) and package init tasks
  are re-registered where applicable.

---

## Health Checks

| Check | Method | Notes |
| --- | --- | --- |
| `minecraft-server` | Port listening on `25565`, then RCON `25575` | 30s grace (vanilla); 300s for modded first boot (loader + mod download) |
| `rcon-admin` | Port listening on `4326` | Sidecar readiness |
| `rcon-proxy` | Port listening on `8080` | User-facing Web Admin path |

---

## Dependencies

None.

---

## Limitations and Differences

1. NeoForge and Fabric mod loaders are surfaced via the **Mod Loader** action (on a bundled Java 21 image); modded Minecraft versions are limited to the Java 21 range (1.20.5–1.21.x). Other upstream modes (Forge, proxy stacks, Spigot/Paper plugins) are not yet surfaced as StartOS actions.
2. Configuration is package-managed: actions write `server.properties` directly. The image's env-var-driven configuration is bypassed via `SKIP_SERVER_PROPERTIES=true`.
3. Web admin access is routed through an internal nginx proxy and exposed as a dedicated StartOS interface.
4. There is no default Web Admin password. The service blocks startup until the user runs the **Set Web Admin Password** action, which generates a random password and displays it once.

---

## What Is Unchanged from Upstream

- Core Minecraft server runtime and world formats.
- Standard client connection flow for Java Edition on TCP port 25565.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local build, install, and release workflow details.

---

## Quick Reference for AI Consumers

```yaml
package_id: minecraft
architectures: [x86_64, aarch64]
volumes:
  main:
    root: /data            # mount in minecraft container
    rcon-db: /opt/rcon-web-admin-<version>/db  # subpath mount in rcon container
ports:
  minecraft-server: 25565
  web-admin: 8080
dependencies: none
managed_files:
  - server.properties     # written directly by package actions
  - whitelist.json        # owned by the server; written via Manage Whitelist (RCON)
  - start9/store.json     # memory profile, mod loader/version/mods, Web Admin creds
minecraft_image_env_vars:
  - EULA
  - TYPE                            # VANILLA | NEOFORGE | FABRIC (store.modLoader)
  - VERSION                         # 26.1.2 (vanilla) or store.modMinecraftVersion
  - INIT_MEMORY
  - MAX_MEMORY
  - SKIP_SERVER_PROPERTIES
  - MODRINTH_PROJECTS               # modded only, when mods are configured
  - MODRINTH_DOWNLOAD_DEPENDENCIES  # modded only ("required")
actions:
  - configure-server
  - mod-loader
  - list-worlds
  - create-world
  - select-world
  - delete-world
  - set-web-admin-password
  - get-server-info
  - get-live-server-stats
  - manage-whitelist
```
