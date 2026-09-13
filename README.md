<p align="center">
  <img src="icon.png" alt="Minecraft Server Logo" width="21%">
</p>

# Minecraft Server on StartOS

> Everything not listed in this document should behave the same as upstream
> Minecraft Server. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

A Minecraft Java Edition server, packaged from [itzg's server image](https://github.com/itzg/docker-minecraft-server). This package manages `server.properties` itself, drives the server over RCON for the things a config file cannot express, and puts a web admin console in front of it.

- **Upstream repo:** <https://github.com/itzg/docker-minecraft-server>
- **Wrapper repo:** <https://github.com/Start9-Community/minecraft-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Five images, and **which server image runs is decided at start**.

| Property      | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Images        | Three `itzg/minecraft-server` tags, an `itzg/rcon` build, nginx |
| Architectures | x86_64, aarch64                                               |
| Command       | Each image's own entrypoint                                   |

| Subcontainer           | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `minecraft-server-sub` | The game server — the one to `attach` to           |
| `rcon-sub`             | The web admin console, speaking RCON to the server |
| `rcon-proxy-sub`       | nginx, unifying the console's two ports into one   |

**Different Java runtimes cover vanilla and the modded generations.** The package ships three server images — Java 25, Java 21, and Java 8 — and picks one from the configured mod loader and Java version: vanilla 26.2 runs on Java 25, modded runs on the Java the user chose in the Mod Loader action (Java 21 by default), and Java 8 serves older modpacks such as Forge 1.12.2 packs. A selected loader, version, modpack, and Java runtime must support each other. Switching loaders or the Java version swaps the image.

All server images and the console's base are **pinned by digest**, so a rebuild produces the same bits rather than following a moving tag.

**The console image is built here, not consumed as-is.** It applies two patches to rcon-web-admin's browser code — a `history.pushState` call that throws and takes the page down with it, and a dropdown that renders empty until it is refreshed. The build fails loudly if either patch no longer applies, rather than silently shipping an unpatched console.

**nginx exists because the console listens on two ports** — HTTP on one, its websocket on another — and a browser reaching it through StartOS gets one address. The proxy serves the page, forwards the websocket, and rewrites the console's own endpoint discovery so the browser is told to connect back through the same address.

## Volume and Data Layout

One volume, holding the server's entire data directory.

| Volume | Mount Point | Purpose                                                 |
| ------ | ----------- | ------------------------------------------------------- |
| `main` | `/data`     | Worlds, configuration, mods, and the console's database |

| Path                    | Written by  | Holds                                                            |
| ----------------------- | ----------- | ---------------------------------------------------------------- |
| `<world-name>/`         | Minecraft   | One directory per world, each with `level.dat`                   |
| `server.properties`     | Both        | The server configuration                                         |
| `start9/store.json`     | Actions     | Memory, credentials, mod loader, Java version, mods, and modpack configuration |
| `start9/modpack.mrpack` | Actions     | An uploaded modpack, read by the image on start                  |
| `rcon-db/`              | The console | Its own settings and widgets                                     |
| `mods/`                 | The image   | Mods downloaded for a modded server, or installed from a pack    |
| `modpack.mrpack`        | The image   | Its cache of a modpack fetched by URL; removed on Force Re-sync  |

**Worlds are discovered from the filesystem, not from a list.** Any directory on the volume containing a `level.dat` is a world, which is what lets the world actions enumerate them and read each one's game mode, difficulty, and last-played time straight out of its NBT data.

The console's database is a **subpath of the same volume** mounted into its own container, so it is captured by the same backup as everything else.

## File Models

Two models, read two different ways — and the difference is deliberate.

| File                | Format | Modelled                | Written by                    |
| ------------------- | ------ | ----------------------- | ----------------------------- |
| `server.properties` | INI    | Yes — `FileHelper.ini`  | Actions, and Minecraft itself |
| `start9/store.json` | JSON   | Yes — `FileHelper.json` | Actions only                  |

**The store is read reactively; `server.properties` is not.** Minecraft truncates and rewrites its properties file on every load, and during that window the file parses as empty — which would look like a changed value and restart the service in a loop. So the properties are read once at start, and the actions that change only that file call for a restart themselves.

Three properties are **pinned rather than merely defaulted**: RCON being enabled, the RCON port, and the server port. They are `z.literal(...).catch(...)`, so an edited value is **repaired on read** — the package's control plane and its health check both depend on them.

The RCON password is generated once at install and lives in the same file. It is the credential the console and every RCON-driven action authenticate with; it is never shown to the user and never needs to be.

`server.properties` also holds everything the **Configure Server** action edits — game mode, difficulty, distances, PvP, whitelist enforcement, MOTD — with each field validated and range-checked on read, so a hand-edited nonsense value falls back to its default rather than failing the start.

The store holds what is not a Minecraft setting: the memory profile, the console's credentials, and the mod loader — with its Java runtime, Minecraft version and mod list, or, for a modpack, the pack's source and options.

## Dependencies

None.

A modded server reaches out to Modrinth at start to download its files. Hosted modpacks fetch the pack itself, while uploaded packs can still fetch downloads listed in `modrinth.index.json`. A modded first boot therefore needs internet; vanilla needs none once installed.

## Network Access and Interfaces

Two interfaces, of very different kinds.

| Interface      | Id                 | Type | Port  | Description                  |
| -------------- | ------------------ | ---- | ----- | ---------------------------- |
| RCON Web Admin | `web-admin`        | ui   | 8080  | The console, through nginx   |
| Minecraft      | `minecraft-server` | p2p  | 25565 | What game clients connect to |

**The game port is bound raw** — no TLS, no proxy, and the external port is requested to match the internal one, because a Minecraft client dials the standard port unless the player types otherwise.

**RCON is never exported.** The port exists inside the service's network namespace, where the console and the package's own code reach it over loopback; nothing binds it to an address.

Authentication is rcon-web-admin's own login form, not a gate added by StartOS — and since the console holds the RCON password, reaching it is full operator control of the server. **The address deliberately carries no `admin@` prefix**: folding the username into the URL is what the SDK would do by default, and Chromium-based browsers strip or refuse userinfo in a top-level navigation, which would break the launch link. The username is always `admin`, typed into the form.

## Installation and First-Run Flow

Install seeds both files with defaults, generates the RCON password, and raises a `critical` task to set the console password.

**The service cannot start until that password is set**, which is what keeps the console from ever coming up with an empty credential in front of an RCON socket.

The first start then generates the world. Ordering is explicit: the server comes up first, the console waits for it, and nginx waits for the console. **A modded first start is much slower** — it installs the loader and downloads every mod before the port opens — so it carries a far longer grace period than vanilla.

**Installing this package accepts Mojang's EULA on your behalf**; the server will not run otherwise.

## Actions

Ten actions, in three groups.

### Setup

#### Configure Server

The gameplay settings and the memory allocation.

- **What it changes:** most of `server.properties`, plus the memory profile in the store.
- **Cost:** the service restarts.
- **Repeat safety:** idempotent, pre-filled from the current state. Memory offers three named profiles plus a custom pair, and a maximum below the minimum is rejected rather than saved.

#### Mod Loader

Vanilla, NeoForge, or Fabric with the Minecraft version, the Java runtime, and the mod list for the modded options — or a Modrinth modpack, which brings its own Minecraft version, loader build, mods, configs and overrides.

- **What it changes:** the loader, Minecraft version, Java runtime, and mods in the store — and through them the server image that runs. For a modpack: the pack's source (a slug, a project or version URL, a direct `.mrpack` URL, or an uploaded file), whether to force a re-sync, and files to exclude.
- **Java Version picks the runtime.** Java 21 (the default) runs NeoForge and current Fabric; Java 8 runs older packs, such as a Forge 1.12.2 pack; Java 25 serves the very latest releases. Vanilla always runs on Java 25 and does not expose the choice. Changing it restarts the server onto a different image, so pick the Java the pack was built for.
- **Cost:** the service restarts onto a different image and, for a modded start, re-downloads mods; a modpack start installs the pack.
- **Repeat safety:** idempotent, pre-filled. Mods are Modrinth project slugs, each optionally pinned to a version or a release channel; required dependencies are pulled automatically. An uploaded pack re-opens on the upload variant with the file empty, meaning "keep it", so the options can be changed without uploading again.
- **An uploaded pack is stored on the volume** at `start9/modpack.mrpack`. The action enforces a 512 MiB limit and validates the root `modrinth.index.json` before replacing it. A validation or staging failure preserves the previous upload, and a SHA-256 identity in `store.json` restarts the service only when the uploaded bytes change.
- **Modrinth project sources are checked on start; direct `.mrpack` URLs are cached.** Force Re-sync removes that URL cache and asks the image to reprocess a project source. It remains stored until turned off, and changing Exclude Files for an unchanged hosted source turns it on automatically. Changing a hosted source invalidates the old URL cache once without enabling Force Re-sync.
- **Switching modes removes only installer-tracked files under `mods/`.** This prevents jars from the prior mode loading alongside the new selection while preserving manually added mods, worlds, and configuration. Each installer retains its own manifest so returning to that mode restores its files normally.
- **`VERSION` is not set for a modpack.** The image's `LATEST` default leaves project resolution unfiltered by game version, while the pack index selects Minecraft and its loader.
- **Exclude Files** matches paths of the pack's listed files only; it does not filter the pack's `overrides/`. The package always excludes `server.properties` and `start9/` from both indexed files and override trees; other pack configuration applies normally.
- **Carries a warning, and it is not decorative.** Existing worlds may not load across a loader or version change. Hand-picked installs require matching loader and Minecraft versions plus the client-required mods; modpack players install the matching client pack.

#### Set Web Admin Password

Generates the console password and shows it once.

- **What it changes:** the password in the store.
- **Cost:** the service restarts.
- **Repeat safety:** each run generates a **new** password. It is never user-chosen.

#### Manage Whitelist

Views and edits the player whitelist, and turns enforcement on or off.

- **Requires the service to be running**, because it works over RCON.
- **What it changes:** the live whitelist, through the server itself — added and removed by name, so the server computes the right UUID for each. The enforcement flags are then written to `server.properties` so they survive a restart.
- **Repeat safety:** it reconciles rather than appends; the list you submit becomes the list.

### Worlds

#### List Worlds

Reads every world directory on the volume and reports its game mode, difficulty, hardcore and cheats flags, last-played time, and the Minecraft version that wrote it.

#### Create World

Sets the active world name and an optional seed, then restarts. **The world itself is generated by Minecraft on the next start**, not by this action — which is why an existing name is refused rather than reused.

#### Select World

Switches the active world to another directory on the volume and restarts. Nothing is deleted or moved.

#### Delete World

Permanently deletes a world directory.

- **Only when the service is stopped**, and only for a world that is not the configured one — switch first.
- Requires typing `DELETE` to confirm.
- **Irreversible.** There is no trash; the backup is the only recovery.

### Info

#### Get Server Info

Reports the configured settings and the console username. Requires the service to be running.

#### Get Live Server Stats

Queries the running server over RCON for who is online and the in-game time. Individual queries that fail are reported as unavailable rather than failing the whole action.

## Tasks

One, raised at install.

| Task                   | Severity   | Raised when | Cleared when    |
| ---------------------- | ---------- | ----------- | --------------- |
| Set Web Admin Password | `critical` | Install     | The action runs |

`critical` blocks the service from starting and suspends the ordinary controls, so a fresh install shows the task and nothing else.

## Health Checks

Three checks, one per daemon.

| Check              | Displayed as           | Method                                  | Grace                          |
| ------------------ | ---------------------- | --------------------------------------- | ------------------------------ |
| `minecraft-server` | "Minecraft Server"     | Game port listening, **then** RCON port | 30s; 300s modded; 900s modpack |
| `rcon-admin`       | "RCON Web Admin"       | The console's port is listening         | —                              |
| `rcon-proxy`       | "RCON Web Admin Proxy" | The proxy's port is listening           | —                              |

**The server's check is two-stage on purpose.** The game port opens before RCON does, and everything this package does administratively goes over RCON — so the check reports "waiting for RCON" in the window where players could connect but the console and the world actions could not.

The modded grace period is ten times the vanilla one because a modded first start downloads a loader and a mod set before it listens at all. A modpack's is longer again: a first install also downloads and verifies every jar in the pack, and a large pack over a home connection outruns the modded allowance.

None of the three says anything about the world: lag, a corrupt chunk, or a mod failing to load all show three green checks and an error in the server logs.

## Backups and Restore

The `main` volume is copied wholesale — `sdk.Backups.ofVolumes('main')` — which is every world, the configuration, the mods, and the console's database.

**A running server is flushed first.** The pre-backup step connects over RCON and issues a save, so what gets copied is a consistent world rather than one mid-write. If the server is running and that flush cannot be performed, **the backup fails** rather than quietly capturing a torn save.

A stopped server is backed up directly, with no flush needed.

A restored instance comes back with the same worlds, console and RCON passwords, mod list, and modpack configuration. A modded server processes that stored configuration on the next start.

## Limitations and Differences

1. **Java Edition only.** Bedrock clients cannot connect.
2. **The vanilla version is the package's**, not the user's — only the modded loaders take a version.
3. **Changing loader or version can strand a world.** Clients need the matching loader and Minecraft version plus the client-required mods or client pack.
4. **Installing accepts the Mojang EULA** on your behalf.
5. **The console has one account.** There is no per-user access to the admin interface, and it holds full RCON control.
6. **Deleting a world requires stopping the service**, and cannot target the active world.
7. **Individual mods come from Modrinth only**, by project slug. A whole pack can be uploaded as a `.mrpack`, which is the way to bring in a mod from anywhere else.
8. **Backups of a running server depend on RCON**; a failed flush aborts the backup by design.
9. **`server.properties` is managed by the package.** The image's own environment-variable generation is disabled, so settings not exposed by an action must be edited in the file.

---

## Quick Reference for AI Consumers

```yaml
package_id: minecraft
image: itzg/minecraft-server # three digest-pinned tags: Java 25, Java 21, and Java 8 runtimes
architectures:
  - x86_64
  - aarch64
subcontainers:
  - minecraft-server-sub # image chosen at start from store.modLoader + store.javaVersion
  - rcon-sub # rcon-web-admin, built here from a digest-pinned itzg/rcon plus two frontend patches
  - rcon-proxy-sub # nginx; unifies the console's http + websocket ports and rewrites /wsconfig
volumes:
  main: /data # worlds, server.properties, start9/store.json, uploaded modpack, rcon-db/
file_models:
  - server.properties # ini; read .once() because Minecraft rewrites it on every load
  - start9/store.json # json; read .const() — memory, console credentials, mod loader + mods, or the modpack's source and options
startos_managed_env_vars:
  - EULA
  - TYPE
  - VERSION
  - INIT_MEMORY
  - MAX_MEMORY
  - RCON_PASSWORD
  - SKIP_SERVER_PROPERTIES
  - MODRINTH_PROJECTS # modded only
  - MODRINTH_DOWNLOAD_DEPENDENCIES # modded only
  - MODRINTH_MODPACK # modpack only; VERSION is then not set
  - MODRINTH_FORCE_SYNCHRONIZE # modpack only, when Force Re-sync is on
  - MODRINTH_EXCLUDE_FILES # modpack only; package protections plus user exclusions
  - MODRINTH_OVERRIDES_EXCLUSIONS # modpack only; protects server.properties and start9/**
dependencies: [] # modded starts need internet; uploaded packs can list remote downloads
interfaces:
  web-admin: { type: ui, port: 8080 } # nginx in front of the console; console's own login
  minecraft-server: { type: p2p, port: 25565 } # raw TCP, external port preserved
actions:
  - configure-server
  - mod-loader
  - set-web-admin-password
  - manage-whitelist # only-running; drives RCON then persists the flags
  - list-worlds
  - create-world
  - select-world
  - delete-world # only-stopped; requires typing DELETE
  - get-server-info # only-running
  - get-live-server-stats # only-running
tasks:
  - { action: set-web-admin-password, severity: critical } # install only
health_checks:
  - minecraft-server # game then RCON; 30s vanilla / 300s NeoForge or Fabric / 900s modpack
  - rcon-admin
  - rcon-proxy
```
