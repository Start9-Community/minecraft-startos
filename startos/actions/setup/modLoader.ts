import { promises as fs } from 'node:fs'
import {
  defaultJavaVersion,
  defaultModLoader,
  defaultModMinecraftVersion,
  storeJson,
  type StoreConfig,
  uploadedModpackPath,
} from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { replaceUploadedModpack } from '../../modpacks'
import { sdk } from '../../sdk'

const { InputSpec, Value, Variants, List } = sdk

const versionField = Value.union({
  name: i18n('Version'),
  description: i18n(
    'Which build to install. Pick a pre-release channel for mods that only publish beta/alpha builds (e.g. JEI on newer Minecraft versions).',
  ),
  default: 'release',
  variants: Variants.of({
    release: {
      name: i18n('Latest release (recommended)'),
      spec: InputSpec.of({}),
    },
    beta: { name: i18n('Latest beta'), spec: InputSpec.of({}) },
    alpha: { name: i18n('Latest alpha'), spec: InputSpec.of({}) },
    pinned: {
      name: i18n('Pin a specific version'),
      spec: InputSpec.of({
        version: Value.text({
          name: i18n('Version or Modrinth version ID'),
          required: true,
          default: null,
          placeholder: '1.0.1',
          masked: false,
        }),
      }),
    },
  }),
})

type VersionValue =
  | { selection: 'release'; value: {} }
  | { selection: 'beta'; value: {} }
  | { selection: 'alpha'; value: {} }
  | { selection: 'pinned'; value: { version: string } }

const javaVersionField = Value.union({
  name: i18n('Java Version'),
  description: i18n(
    'The Java the server runs on, downloaded on first use. Java 21 runs NeoForge and current Fabric; Java 17 runs Minecraft 1.17 to 1.20 loaders; Java 8 runs older packs such as Forge 1.12.2. Pick the Java the loader or pack was built for.',
  ),
  default: defaultJavaVersion,
  variants: Variants.of({
    java25: { name: i18n('Java 25'), spec: InputSpec.of({}) },
    java21: { name: i18n('Java 21'), spec: InputSpec.of({}) },
    java17: { name: i18n('Java 17'), spec: InputSpec.of({}) },
    java8: { name: i18n('Java 8'), spec: InputSpec.of({}) },
  }),
})

const maximumExclusionsBytes = 64 * 1024
const maximumExclusionsCharacters = 64 * 1024

const isUpload = (source: string): boolean => source === uploadedModpackPath

const isHostedSource = (source: string): boolean => {
  if (source.startsWith('/') || source.startsWith('\\')) return false

  if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(source)) {
    try {
      const protocol = new URL(source).protocol
      return protocol === 'http:' || protocol === 'https:'
    } catch {
      return false
    }
  }

  return !/\.mrpack$/i.test(source)
}

const sameModpackConfiguration = (
  current: StoreConfig | null,
  next: {
    modLoader: 'modpack'
    javaVersion: StoreConfig['javaVersion']
    modpack: StoreConfig['modpack']
  },
): boolean =>
  current?.modLoader === next.modLoader &&
  current.javaVersion === next.javaVersion &&
  current.modpack.source === next.modpack.source &&
  (current.modpack.excludeFiles?.trim() || undefined) ===
    next.modpack.excludeFiles &&
  current.modpack.forceResync === next.modpack.forceResync &&
  current.modpack.uploadHash === next.modpack.uploadHash

const toVersionValue = (version: string | undefined): VersionValue =>
  !version
    ? { selection: 'release', value: {} }
    : version === 'beta' || version === 'alpha'
      ? { selection: version, value: {} }
      : { selection: 'pinned', value: { version } }

const moddedSpec = InputSpec.of({
  minecraftVersion: Value.text({
    name: i18n('Minecraft Version'),
    description: i18n(
      'Minecraft version for the modded server. It must be supported by the loader, the mods, and the chosen Java. Every client must run this version.',
    ),
    required: true,
    default: defaultModMinecraftVersion,
    placeholder: '1.21.8',
    masked: false,
  }),
  javaVersion: javaVersionField,
  mods: Value.list(
    List.obj(
      {
        name: i18n('Mods'),
        description: i18n(
          'Mods to install from Modrinth. Dependencies download automatically. Every client must install the client-required mods at matching versions.',
        ),
        default: [],
      },
      {
        spec: InputSpec.of({
          slug: Value.text({
            name: i18n('Modrinth Project Slug'),
            description: i18n(
              'Modrinth project slug, e.g. "giants-of-the-cretaceous".',
            ),
            required: true,
            default: null,
            placeholder: 'giants-of-the-cretaceous',
            masked: false,
          }),
          version: versionField,
        }),
        displayAs: '{{slug}}',
        uniqueBy: 'slug',
      },
    ),
  ),
})

const modpackSpec = InputSpec.of({
  source: Value.union({
    name: i18n('Modpack Source'),
    description: i18n(
      'Where to get the pack. Modrinth project sources are checked on start, direct .mrpack URLs are cached, and uploaded packs are kept on the volume.',
    ),
    default: 'url',
    variants: Variants.of({
      url: {
        name: i18n('Modrinth project or URL'),
        spec: InputSpec.of({
          url: Value.text({
            name: i18n('Modpack'),
            description: i18n(
              'A Modrinth modpack slug or project ID, a project page URL, a version page URL (to pin one version), or a direct URL to a .mrpack file.',
            ),
            required: true,
            default: null,
            placeholder: 'cobblemon-fabric',
            masked: false,
          }),
        }),
      },
      upload: {
        name: i18n('Upload a .mrpack file'),
        spec: InputSpec.of({
          file: Value.file({
            name: i18n('Modpack File'),
            description: i18n(
              'A .mrpack exported from a launcher. Uploads are limited to 512 MiB and kept on the server volume. Leave empty to keep the pack already uploaded and change only the options below.',
            ),
            extensions: ['.mrpack'],
            required: false,
          }),
        }),
      },
    }),
  }),
  javaVersion: javaVersionField,
  forceResync: Value.toggle({
    name: i18n('Force Re-sync'),
    description: i18n(
      'Turn on when a pack has changed without its source changing. Modrinth project sources are checked on start, but direct .mrpack URLs stay cached unless Force Re-sync is enabled. Uploaded packs remain on the volume. Force Re-sync stays enabled until you turn it off.',
    ),
    default: false,
  }),
  excludeFiles: Value.textarea({
    name: i18n('Exclude Files'),
    description: i18n(
      'Optional. One entry per line. Use this only when a pack marks a client-only mod as server-compatible, which shows up as a crash on start naming that mod. Each entry is a case-insensitive substring of the file path.',
    ),
    required: false,
    default: null,
    placeholder: 'notenoughanimations',
    minLength: null,
    maxLength: maximumExclusionsCharacters,
  }),
})

const loaderVariants = Variants.of({
  vanilla: {
    name: i18n('Vanilla (no mods) — default'),
    spec: InputSpec.of({}),
  },
  neoforge: {
    name: i18n('NeoForge (recommended for mods)'),
    spec: moddedSpec,
  },
  fabric: {
    name: i18n('Fabric'),
    spec: moddedSpec,
  },
  modpack: {
    name: i18n('Modrinth Modpack (installs mods, configs and loader together)'),
    spec: modpackSpec,
  },
})

const inputSpec = InputSpec.of({
  loader: Value.union({
    name: i18n('Mod Loader'),
    description: i18n(
      'Vanilla runs the latest Minecraft with no mods. NeoForge or Fabric let you pick mods yourself. A Modrinth modpack installs a curated set — mods, configs and the loader build it was built against — in one step.',
    ),
    default: defaultModLoader,
    variants: loaderVariants,
  }),
})

export const modLoader = sdk.Action.withInput(
  'mod-loader',
  async () => ({
    name: i18n('Mod Loader'),
    description: i18n(
      'Choose vanilla, NeoForge, Fabric, or a Modrinth modpack, and install mods',
    ),
    warning: i18n(
      'Changing the loader, Minecraft version, or Java swaps the server engine. Existing worlds may not load — create a new world after switching. For hand-picked mods, every player needs the same loader and Minecraft version plus the client-required mods at matching versions. For a modpack, every player needs the matching client pack. Modded servers also need more memory — set Standard or High under Configure Server.',
    ),
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => {
    const store = await storeJson.read().once()
    if (!store) return {}

    if (store.modLoader === 'vanilla') {
      return { loader: { selection: 'vanilla' as const, value: {} } }
    }

    if (store.modLoader === 'modpack') {
      const { source, excludeFiles } = store.modpack
      return {
        loader: {
          selection: 'modpack' as const,
          value: {
            source: isUpload(source)
              ? { selection: 'upload' as const, value: { file: null } }
              : { selection: 'url' as const, value: { url: source } },
            javaVersion: { selection: store.javaVersion, value: {} },
            excludeFiles: excludeFiles ?? null,
            forceResync: store.modpack.forceResync,
          },
        },
      }
    }

    return {
      loader: {
        selection: store.modLoader,
        value: {
          minecraftVersion: store.modMinecraftVersion,
          javaVersion: { selection: store.javaVersion, value: {} },
          mods: store.mods.map((mod) => ({
            slug: mod.slug,
            version: toVersionValue(mod.version),
          })),
        },
      },
    }
  },
  async ({ effects, input }) => {
    if (input.loader.selection === 'vanilla') {
      await storeJson.merge(effects, { modLoader: 'vanilla' })
      return
    }

    if (input.loader.selection === 'modpack') {
      const current = await storeJson.read().once()
      const { source, javaVersion, excludeFiles, forceResync } =
        input.loader.value
      const normalizedExclusions = excludeFiles?.trim() || undefined
      if (
        normalizedExclusions &&
        Buffer.byteLength(normalizedExclusions, 'utf8') > maximumExclusionsBytes
      ) {
        throw new Error(i18n('Exclude Files must be no larger than 64 KiB.'))
      }

      const packSource =
        source.selection === 'upload'
          ? uploadedModpackPath
          : source.value.url.trim()
      if (source.selection === 'url' && !isHostedSource(packSource)) {
        throw new Error(
          i18n('Enter a Modrinth project ID, slug, or HTTP(S) URL.'),
        )
      }
      if (
        source.selection === 'upload' &&
        !source.value.file &&
        !isUpload(current?.modpack.source ?? '')
      ) {
        throw new Error(
          i18n('Choose a .mrpack file to upload, or give a URL instead.'),
        )
      }

      const exclusionsChanged =
        normalizedExclusions !==
        (current?.modpack.excludeFiles?.trim() || undefined)
      const effectiveForceResync =
        forceResync ||
        (!isUpload(packSource) &&
          packSource === current?.modpack.source &&
          exclusionsChanged)
      const nextConfiguration = (uploadHash: string | undefined) => ({
        modLoader: 'modpack' as const,
        javaVersion: javaVersion.selection,
        modpack: {
          source: packSource,
          excludeFiles: normalizedExclusions,
          forceResync: effectiveForceResync,
          uploadHash,
        },
      })

      if (source.selection === 'upload' && source.value.file) {
        await replaceUploadedModpack(source.value.file, async (uploadHash) => {
          await storeJson.merge(effects, nextConfiguration(uploadHash))
        })
        return
      }

      const next = nextConfiguration(
        isUpload(packSource) ? current?.modpack.uploadHash : undefined,
      )
      const configurationChanged = !sameModpackConfiguration(current, next)
      if (!isUpload(packSource) && packSource !== current?.modpack.source) {
        await fs.rm(sdk.volumes.main.subpath('modpack.mrpack'), { force: true })
      }
      await storeJson.merge(effects, next)
      if (
        !configurationChanged &&
        !isUpload(packSource) &&
        effectiveForceResync
      ) {
        await effects.restart()
      }
      return
    }

    await storeJson.merge(effects, {
      modLoader: input.loader.selection,
      modMinecraftVersion: input.loader.value.minecraftVersion,
      javaVersion: input.loader.value.javaVersion.selection,
      mods: input.loader.value.mods.map((mod) => {
        const version = mod.version
        if (version.selection === 'pinned') {
          return { slug: mod.slug, version: version.value.version }
        }
        if (version.selection === 'release') {
          return { slug: mod.slug }
        }
        return { slug: mod.slug, version: version.selection }
      }),
    })
  },
)
