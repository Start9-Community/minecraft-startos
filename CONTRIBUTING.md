# Contributing

This repo packages [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server) (a wrapper around vanilla Minecraft Java Edition) for StartOS.

## Documentation — keep it in sync

- **`README.md`** — what this package is and how it's built (image, volumes, interfaces). For developers and AI assistants.
- **`instructions.md`** — the user-facing instructions packed into the `.s9pk` and shown on the **Instructions** tab in StartOS, for the person running the service.
- **`CONTRIBUTING.md`** — this file.
- **`CLAUDE.md`** — operating rules for AI developers working in this repo.

**Any code change that warrants it must update `README.md` and `instructions.md` in the same change** — a new or renamed action, an added or removed volume / port / interface / dependency, a changed default, a new limitation, any altered user-visible behavior. Don't defer: a package that ships with a stale README or stale instructions is not done, even if the code is perfect. Content rules live in the packaging guide: [Writing READMEs](https://docs.start9.com/packaging/writing-readmes.html) and [Writing Service Instructions](https://docs.start9.com/packaging/writing-instructions.html).

## Building

See the [StartOS Packaging Guide](https://docs.start9.com/packaging/) for environment setup, then:

```bash
npm ci    # install dependencies
make      # build the universal .s9pk
```

## Updating the upstream version

Minecraft has **two coupled version handles** that must be moved together — see `CLAUDE.md` for the full rationale.

1. Pick the new `itzg/minecraft-server:<base>@sha256:<digest>` image (look up digests at <https://hub.docker.com/r/itzg/minecraft-server/tags>) and update the `minecraft-server` `dockerTag` in `startos/manifest/index.ts`.
2. Bump the `VERSION:` env value in `startos/main.ts` to the new Minecraft release. It must be a release that runs on the JDK the chosen base tag provides.
3. Update `version` and `releaseNotes` in the file under `startos/versions/`, renaming it to the new version string. A *new* version file is only needed when the bump carries an `up`/`down` migration, or when you want the old release notes preserved in git history — see [Versions](https://docs.start9.com/packaging/versions.html).
4. Rebuild (`make`), sideload the `.s9pk`, and confirm it starts.
5. Review `README.md` and `instructions.md` for anything the bump changed.

For RCON Web Admin sidecar bumps and `rcon-proxy` (nginx) bumps, see the `CLAUDE.md` operating rules — those have their own coupled paths to update.

## How to contribute

1. Fork the repository and create a branch from `master`.
2. Make your changes — including the doc updates above.
3. Open a pull request to `master`.
