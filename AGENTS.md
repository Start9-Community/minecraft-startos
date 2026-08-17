# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **`RCON_PASSWORD` must be handed to the image.** Without it `mc-server-runner` can't stop the server over RCON: vanilla falls back to writing `stop` to the console, but a modded server runs under `run.sh` where that also fails, so the JVM is SIGKILLed after the termination grace instead of saving.
- **`SKIP_SERVER_PROPERTIES` is load-bearing** — the package owns that file via `FileHelper.ini`, and letting the image regenerate it from env vars would overwrite every managed setting.
- **`rconWebAdminDbPath` embeds the rcon-web-admin version** and must be updated with the `FROM` line in `rcon.Dockerfile` — the image installs to a versioned directory, and a stale path mounts the volume somewhere nothing reads.
- **The whitelist is edited over RCON, not by writing `whitelist.json`.** The server resolves each name to the mode-correct UUID; writing the file directly gets offline-mode players wrong. The enforcement flags are then persisted to `server.properties`, which is the source of truth on restart.
- **`enable-rcon`, `rcon.port` and `server-port` are `z.literal` pins**, so a user edit is repaired on read. The health check, the console, and every RCON-driven action depend on them.
