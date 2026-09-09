import { promises as fs } from 'node:fs'
import {
  defaultModLoader,
  defaultModMinecraftVersion,
  storeJson,
  uploadedModpackPath,
} from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value, Variants, List } = sdk

// Per-mod version selector, mapping to the optional `version` on a stored mod
// entry: a release channel (beta/alpha) or a pinned version / Modrinth version
// ID. "release" means no pin (latest stable).
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

// Map a stored version string to the form's version-union value.
type VersionValue =
  | { selection: 'release'; value: {} }
  | { selection: 'beta'; value: {} }
  | { selection: 'alpha'; value: {} }
  | { selection: 'pinned'; value: { version: string } }

// Where an uploaded pack lives on the volume, relative to its root. The
// container sees it at `uploadedModpackPath`.
const uploadedModpackSubpath = 'start9/modpack.mrpack'

// A stored modpack source is either something the user typed -- a slug or a
// URL -- or the fixed path of an uploaded pack.
const isUpload = (source: string): boolean => source === uploadedModpackPath

const toVersionValue = (version: string | undefined): VersionValue =>
  !version
    ? { selection: 'release', value: {} }
    : version === 'beta' || version === 'alpha'
      ? { selection: version, value: {} }
      : { selection: 'pinned', value: { version } }

// A .mrpack is a zip whose index is a member named `modrinth.index.json`; the
// name appears verbatim in the zip's central directory. The extension filter
// only constrains the form, and a pack that is not one fails at install with
// a message about a project that does not exist.
const isModrinthPack = (bytes: Buffer): boolean =>
  bytes.subarray(0, 2).equals(Buffer.from('PK')) &&
  bytes.includes('modrinth.index.json')

const moddedSpec = InputSpec.of({
  minecraftVersion: Value.text({
    name: i18n('Minecraft Version'),
    description: i18n(
      'Minecraft version for the modded server. Must be supported by the loader and your mods, and within the bundled Java 21 range (1.20.5–1.21.x). Every client must run this exact version.',
    ),
    required: true,
    default: defaultModMinecraftVersion,
    placeholder: '1.21.8',
    masked: false,
  }),
  mods: Value.list(
    List.obj(
      {
        name: i18n('Mods'),
        description: i18n(
          'Mods to install from Modrinth. Dependencies download automatically. Every client must install these same mods at the same versions.',
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

// A whole Modrinth modpack, rather than a hand-picked mod list. The pack
// carries its own Minecraft version and loader build, so neither is asked for.
const modpackSpec = InputSpec.of({
  source: Value.union({
    name: i18n('Modpack Source'),
    description: i18n(
      'Where to get the pack. A hosted pack is re-fetched on rebuild; an uploaded one is kept on the volume.',
    ),
    default: 'url',
    variants: Variants.of({
      url: {
        name: i18n('Modrinth project or URL'),
        spec: InputSpec.of({
          url: Value.text({
            name: i18n('Modpack'),
            description: i18n(
              'A Modrinth modpack slug or project ID, a project page URL, a version page URL (to pin one version), or a direct URL to a .mrpack file. The pack must be for Minecraft 1.20.5–1.21.x, the range of the bundled Java 21 runtime; a 1.20.1 pack will not start.',
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
              'A .mrpack exported from a launcher, for Minecraft 1.20.5–1.21.x. Kept on the server volume, so allow for its size. Leave empty to keep the pack already uploaded and change only the options below.',
            ),
            extensions: ['.mrpack'],
            required: false,
          }),
        }),
      },
    }),
  }),
  forceResync: Value.toggle({
    name: i18n('Force Re-sync'),
    description: i18n(
      'Turn on when you have re-published the pack at the same address. A pack given by URL is identified by that URL, so an edited pack at the same address looks unchanged and is skipped; this discards the cached copy so the pack is fetched and applied again, and whatever the previous pack shipped that this one does not is removed. Leave off for normal running: it re-downloads on every start.',
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
    maxLength: null,
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
      'Vanilla runs the latest Minecraft with no mods. NeoForge or Fabric run an older, mod-compatible Minecraft on a Java 21 runtime and let you pick mods yourself. A Modrinth modpack installs a curated set — mods, configs and the loader build it was built against — in one step.',
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
      'Changing the loader or Minecraft version swaps the server engine. Existing worlds may not load — create a new world after switching. Every player must install the EXACT same loader, Minecraft version, and mods in their client (e.g. via Prism Launcher) or they cannot connect. Modded servers also need more memory — set Standard or High under Configure Server.',
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
      // An uploaded pack re-opens on the upload variant with the file empty,
      // which means "keep it": the options can be changed without uploading
      // the pack again.
      return {
        loader: {
          selection: 'modpack' as const,
          value: {
            source: isUpload(source)
              ? { selection: 'upload' as const, value: { file: null } }
              : { selection: 'url' as const, value: { url: source } },
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
      const { source, excludeFiles, forceResync } = input.loader.value
      const current = await storeJson.read().once()
      let packSource: string
      if (source.selection === 'upload') {
        if (source.value.file) {
          // The upload is a file in this action's own runtime, which the
          // game container cannot see: copy it onto the volume, at a fixed
          // path the container reads. Not the image's own `modpack.mrpack`,
          // which is its cache of a URL download and is cleared on re-sync.
          const uploaded = await fs.readFile(source.value.file.path)
          if (!isModrinthPack(uploaded)) {
            throw new Error(
              i18n(
                'That file is not a Modrinth modpack: no modrinth.index.json inside it.',
              ),
            )
          }
          await sdk.volumes.main.writeFile(uploadedModpackSubpath, uploaded)
        } else if (!isUpload(current?.modpack.source ?? '')) {
          throw new Error(
            i18n('Choose a .mrpack file to upload, or give a URL instead.'),
          )
        }
        packSource = uploadedModpackPath
      } else {
        packSource = source.value.url.trim()
      }
      await storeJson.merge(effects, {
        modLoader: 'modpack',
        modpack: {
          source: packSource,
          excludeFiles: excludeFiles?.trim() || undefined,
          forceResync,
        },
      })
      return
    }

    await storeJson.merge(effects, {
      modLoader: input.loader.selection,
      modMinecraftVersion: input.loader.value.minecraftVersion,
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
