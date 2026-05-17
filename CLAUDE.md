# CLAUDE.md

See [CONTRIBUTING.md](CONTRIBUTING.md) for the doc map and contribution workflow.

## Operating rules

- **Fork of `Scott-Sanderson/minecraft-startos`.** Confirm with `gh api repos/Start9-Community/minecraft-startos --jq '.parent.full_name'` — `manifest.upstreamRepo` points at `itzg/docker-minecraft-server`, the upstream *software*, not the parent of this packaging repo. Sync the fork before making changes; upstream Scott-Sanderson is active.
- **Two coupled version handles for every Minecraft release bump.** This package wraps `itzg/minecraft-server`, which itself runs vanilla Minecraft Java Edition:
  1. **Image pin** — `startos/manifest/index.ts`, the `dockerTag` for the `minecraft-server` image. Form is `itzg/minecraft-server:<base>@sha256:<digest>`. The base tag (e.g. `java25`) selects the JDK; the digest pins a specific multi-arch image.
  2. **Game version** — `startos/main.ts`, the literal `VERSION:` env value passed to the daemon. The image picks the JRE; this picks the Minecraft release. The `VERSION` you set must be a release that runs on whatever JDK the image carries.

  Look up current digests for a given `java<N>` tag at <https://hub.docker.com/r/itzg/minecraft-server/tags>.
- **RCON Web Admin sidecar.** The `rcon` image is a local `dockerBuild` from `rcon.Dockerfile`, which pins `itzg/rcon@sha256:...` (currently bundling `rcon-web-admin` 0.14.1). The bundled rcon-web-admin version appears in **two places that must stay in sync**:
  - `rcon.Dockerfile` — the comment on the `FROM` line documents the bundled rcon-web-admin version.
  - `startos/main.ts` — `rconWebAdminDbPath` mounts `/opt/rcon-web-admin-<version>/db`. The path is version-stamped inside the image; it must match.

  When bumping `itzg/rcon`, check the new image's `/opt/rcon-web-admin-*/` directory and update both the Dockerfile comment and `rconWebAdminDbPath`. `docker/rcon/apply-patches.js` patches the image at build time; review when bumping.
- **Other images.** `rcon-proxy` is `nginx:<X>-alpine` — cosmetic, bump independently if you want a newer nginx.
- **Versions graph.** Currently `current` only with `other: []` — the initial stable was cut from a clean alpha collapse, no historical migration paths. Future bumps that change persistent on-disk state must add the prior version to `other` with a real `up` migration; pure wrapper-only bumps with no state change can keep `other` short by following the alpha rolling-rename pattern documented in `~/dev/start9/services/CLAUDE.md`.
