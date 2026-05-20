# Updating the upstream version

This package wraps `itzg/minecraft-server` (the canonical containerized Minecraft Java Edition server) and ships two sidecars (`itzg/rcon` and an `nginx` proxy). The "upstream version" therefore has **three independently versioned image sources** plus the Mojang Minecraft release that the `itzg/minecraft-server` image launches via its `VERSION` env. The Minecraft release is coupled to the `itzg/minecraft-server` base tag — a `VERSION` only runs on the JDK the chosen tag provides — so those two must always move together.

## Determining the upstream version

**`itzg/minecraft-server`** — the container that runs the Minecraft Java Edition server.
- Canonical home: <https://hub.docker.com/r/itzg/minecraft-server>
- List recent tags + their digests:
  ```sh
  curl -fsSL "https://hub.docker.com/v2/repositories/itzg/minecraft-server/tags?page_size=20&ordering=last_updated" \
    | jq -r '.results[] | "\(.name)\t\(.digest)"'
  ```
- Pinned in `startos/manifest/index.ts` at `images.minecraft-server.source.dockerTag` (e.g. `itzg/minecraft-server:java25@sha256:…`).

**Mojang Minecraft release** — the Minecraft server release the image starts.
- Canonical home: <https://www.minecraft.net/en-us/download/server> (or release notes at <https://www.minecraft.net/en-us/article>).
- Look up via the launcher manifest:
  ```sh
  curl -fsSL https://launchermeta.mojang.com/mc/game/version_manifest_v2.json \
    | jq -r '.latest'
  ```
- Pinned in `startos/main.ts` as the `VERSION:` env on the `minecraft-server` daemon (e.g. `VERSION: '26.1.2'`).

**`itzg/rcon`** — the RCON Web Admin sidecar base image.
- Canonical home: <https://hub.docker.com/r/itzg/rcon>
- List recent tags + their digests:
  ```sh
  curl -fsSL "https://hub.docker.com/v2/repositories/itzg/rcon/tags?page_size=20&ordering=last_updated" \
    | jq -r '.results[] | "\(.name)\t\(.digest)"'
  ```
- Pinned in `rcon.Dockerfile` via `FROM itzg/rcon@sha256:…`.

**`nginx`** — the `rcon-proxy` reverse-proxy image.
- Canonical home: <https://hub.docker.com/_/nginx>
- List recent `*-alpine` tags:
  ```sh
  curl -fsSL "https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=50&ordering=last_updated" \
    | jq -r '.results[].name' | grep -- '-alpine$'
  ```
- Pinned in `startos/manifest/index.ts` at `images.rcon-proxy.source.dockerTag` (e.g. `nginx:1.27-alpine`).

## Applying the bump

**`itzg/minecraft-server` + Minecraft release** (move together):
1. In `startos/manifest/index.ts`, update the `dockerTag` for the `minecraft-server` image to `itzg/minecraft-server:<base>@sha256:<digest>` using the new base tag (e.g. `java25`, `java21`) and the digest from the Docker Hub query above.
2. In `startos/main.ts`, update the `VERSION:` value inside the `minecraft-server` daemon's `exec.env` to the new Mojang release. Confirm the release runs on the JDK provided by the chosen base tag.

**`itzg/rcon`**: in `rcon.Dockerfile`, update the `FROM itzg/rcon@sha256:<digest>` line to the new digest.

**`nginx` (`rcon-proxy`)**: in `startos/manifest/index.ts`, update the `dockerTag` for the `rcon-proxy` image to the new `nginx:<tag>-alpine` value.

After any of the above, bump `version` / `releaseNotes` in `startos/versions/` per `CONTRIBUTING.md`.
