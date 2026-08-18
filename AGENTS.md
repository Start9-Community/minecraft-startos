# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **`RCON_PASSWORD` must be handed to the image.** Without it `mc-server-runner` can't stop the server over RCON: vanilla falls back to writing `stop` to the console, but a modded server runs under `run.sh` where that also fails, so the JVM is SIGKILLed after the termination grace instead of saving.
- **`SKIP_SERVER_PROPERTIES` is load-bearing** — the package owns that file via `FileHelper.ini`, and letting the image regenerate it from env vars would overwrite every managed setting.
- **`rconWebAdminDbPath` embeds the rcon-web-admin version** and must be updated with the `FROM` line in `rcon.Dockerfile` — the image installs to a versioned directory, and a stale path mounts the volume somewhere nothing reads.
- **The whitelist is edited over RCON, not by writing `whitelist.json`.** The server resolves each name to the mode-correct UUID; writing the file directly gets offline-mode players wrong. The enforcement flags are then persisted to `server.properties`, which is the source of truth on restart.
- **`enable-rcon`, `rcon.port` and `server-port` are `z.literal` pins**, so a user edit is repaired on read. The health check, the console, and every RCON-driven action depend on them.
