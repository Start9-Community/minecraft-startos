# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `minecraft`.** A vanilla Java Edition Minecraft server (optional NeoForge/Fabric mod loaders) plus an RCON-based web admin. `main.ts` runs three daemons/subcontainers: `minecraft-server-sub` (the game server), `rcon-sub` (the rcon-web-admin sidecar), and `rcon-proxy-sub` (an nginx proxy in front of the web admin). The RCON password is auto-generated on install and injected into both the server and the admin; the package speaks the RCON protocol directly from `startos/rcon.ts` (used by the world/whitelist/stats actions and the pre-backup `save-all flush`). No package dependencies.

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach minecraft -n <name> -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — `minecraft-server-sub`, `rcon-sub`, or `rcon-proxy-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
