# CLAUDE.md

See [CONTRIBUTING.md](CONTRIBUTING.md) for the doc map and contribution workflow.

## How the upstream version is pulled

This package wraps `itzg/minecraft-server`, which itself runs vanilla Minecraft Java Edition. There are **two coupled version handles** that must move together on every Minecraft release bump:

1. **Image pin** — `startos/manifest/index.ts`, the `dockerTag` for the `minecraft-server` image. Form is `itzg/minecraft-server:<base>@sha256:<digest>`. The base tag (e.g. `java25`) selects the JDK; the digest pins a specific multi-arch image.
2. **Game version** — `startos/main.ts`, the literal `VERSION:` env value passed to the daemon. The image picks the JRE; this picks the Minecraft release.

Look up the current digest for a given `java<N>` tag at <https://hub.docker.com/r/itzg/minecraft-server/tags>. The `VERSION` value you set must be a Minecraft release that runs on whatever JDK the image carries.

## RCON Web Admin sidecar

The `rcon` image is a **local `dockerBuild`** from `rcon.Dockerfile`, which pins `itzg/rcon@sha256:...` (currently bundling `rcon-web-admin` 0.14.1). The bundled rcon-web-admin version appears in **two places** that must stay in sync:

- `rcon.Dockerfile` — the comment on the `FROM` line documents the bundled rcon-web-admin version.
- `startos/main.ts` — `rconWebAdminDbPath` mounts `/opt/rcon-web-admin-<version>/db`. This path is version-stamped inside the image; it must match.

If you bump `itzg/rcon`, check the new image's `/opt/rcon-web-admin-*/` directory and update both the Dockerfile comment and `rconWebAdminDbPath`.

`docker/rcon/apply-patches.js` patches the image at build time; review when bumping.

## Other images

- `rcon-proxy`: `nginx:<X>-alpine`. Cosmetic — bump independently if you want a newer nginx.

## Fork

`Start9-Community/minecraft-startos` is a fork of `Scott-Sanderson/minecraft-startos`. Use `gh api repos/Start9-Community/minecraft-startos --jq '.parent.full_name'` to confirm — `manifest.upstreamRepo` points at `itzg/docker-minecraft-server`, which is the upstream *software*, not the parent of this packaging repo.

Sync the fork before making changes; upstream Scott-Sanderson is active.

## Versions

The version graph currently has `current` only (`other: []`) — the initial stable was cut from a clean alpha collapse, no historical migration paths. Future bumps that change persistent on-disk state must add the prior version to `other` with a real `up` migration; pure wrapper-only bumps with no state change can keep `other` short by following the alpha rolling-rename pattern documented in `~/dev/start9/services/CLAUDE.md`.
