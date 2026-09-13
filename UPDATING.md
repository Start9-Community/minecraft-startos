# Updating the upstream version

This package wraps `itzg/minecraft-server` (the canonical containerized Minecraft Java Edition server) and ships two sidecars (`itzg/rcon` and an `nginx` proxy). The "upstream version" therefore has **three independently versioned image sources** plus the Mojang Minecraft release that the `itzg/minecraft-server` image launches via its `VERSION` env. The Minecraft release is coupled to the `itzg/minecraft-server` base tag — vanilla runs on the Java the chosen tag bundles — so those two must always move together. The Javas a modded server can run on are downloaded from Adoptium at start, not shipped, so they have no pin here.

## Determining the upstream version

**`itzg/minecraft-server`** — the container that runs the Minecraft Java Edition server.

- Canonical home: <https://hub.docker.com/r/itzg/minecraft-server>
- List recent tags + their digests:
  ```sh
  curl -fsSL "https://hub.docker.com/v2/repositories/itzg/minecraft-server/tags?page_size=20&ordering=last_updated" \
    | jq -r '.results[] | "\(.name)\t\(.digest)"'
  ```
- Pinned in `startos/manifest/index.ts` at `images.minecraft-server.source.dockerTag` (e.g. `itzg/minecraft-server:java25@sha256:…`).
- **The base tag's Java is also named in code.** `bundledJavaVersion` in `startos/main.ts` and the `javaVersionSchema` enum in `startos/fileModels/store.json.ts` (with its variant in `startos/actions/setup/modLoader.ts`) name the bundled Java; moving to a tag with a newer Java means adding that version to the enum and pointing `bundledJavaVersion` at it, or the bundled Java is downloaded a second time.

**Mojang Minecraft release** — the Minecraft server release the image starts.

- Canonical home: <https://www.minecraft.net/en-us/download/server> (or release notes at <https://www.minecraft.net/en-us/article>).
- Look up via the launcher manifest:
  ```sh
  curl -fsSL https://launchermeta.mojang.com/mc/game/version_manifest_v2.json \
    | jq -r '.latest'
  ```
- Pinned in `startos/main.ts` as the `vanillaVersion` constant, which `main` passes as `VERSION` when the mod loader is vanilla (e.g. `const vanillaVersion = '26.2'`). A modded server's version is the user's, set by the **Mod Loader** action and stored as `modMinecraftVersion`.

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
- Pinned in `startos/manifest/index.ts` at `images.rcon-proxy.source.dockerTag` (e.g. `nginx:1.30-alpine`; track the stable line, not mainline).

## Applying the bump

**`itzg/minecraft-server` + Minecraft release** (move together):

1. In `startos/manifest/index.ts`, update the `dockerTag` for the `minecraft-server` image to `itzg/minecraft-server:<base>@sha256:<digest>` using the new base tag (e.g. `java25`) and the digest from the Docker Hub query above. If the base tag's Java changed, update `bundledJavaVersion` and the `javaVersionSchema` enum as described above.
2. In `startos/main.ts`, update `vanillaVersion` to the new Mojang release. Confirm the release runs on the Java the chosen base tag bundles — vanilla has no other Java to fall back on.

**`itzg/rcon`**: in `rcon.Dockerfile`, update the `FROM itzg/rcon@sha256:<digest>` line to the new digest. Its `apply-patches.js` throws when a snippet no longer matches, which is deliberate — a silently unpatched rcon-web-admin has a `pushState` that takes the page down and a dropdown that renders empty. Re-derive the patch rather than dropping it.

**`nginx` (`rcon-proxy`)**: in `startos/manifest/index.ts`, update the `dockerTag` for the `rcon-proxy` image to the new `nginx:<tag>-alpine` value.

After any of the above, bump `version` / `releaseNotes` in `startos/versions/current.ts` per the standard packaging conventions.
