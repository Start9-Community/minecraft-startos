import {
  defaultModLoader,
  defaultModMinecraftVersion,
  storeJson,
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

// A stored modpack source is either a URL/slug the user typed or a path to an
// uploaded file. Only the former can be put back in the form.
const isUrl = (source: string): boolean =>
  source.length > 0 && !source.startsWith('/')

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

// A whole Modrinth modpack, rather than a hand-picked mod list.
//
// The pack carries its own Minecraft version and loader build in its
// `dependencies`, and the image honours both — so neither is asked for here.
// That is the substantive difference from the per-mod path: a pack pins the
// loader, which `MODRINTH_PROJECTS` cannot, and a client whose modpack names a
// different loader build than the server installed is refused at connect.
//
// The pack's per-file `env` markers decide what reaches the server, so a pack
// exported from a client instance installs correctly without editing: its
// client-only mods, resource packs and shaders are skipped server-side.
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
              'A .mrpack exported from a launcher. Kept on the server volume, so allow for its size.',
            ),
            extensions: ['.mrpack'],
            required: true,
          }),
        }),
      },
    }),
  }),
  forceResync: Value.toggle({
    name: i18n('Force Re-sync'),
    description: i18n(
      'Turn on when you have re-published the pack at the same address, or after changing packs. A pack given by URL is identified by that URL, so an edited pack at the same address looks unchanged and is skipped entirely. This discards the cached copy AND empties the mods folder so it ends up matching the pack exactly -- without it, a jar from a previously applied pack is never removed. Any mod you added by hand is deleted too. Leave off for normal running: it re-downloads and re-installs on every start.',
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
    description: i18n('Choose vanilla, NeoForge, or Fabric and install mods'),
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
      // An uploaded pack is stored as a path on the volume, and re-presenting
      // it as a URL to be re-typed would be worse than asking for it again --
      // so only a URL source round-trips into the form.
      return {
        loader: {
          selection: 'modpack' as const,
          value: {
            source: isUrl(source)
              ? { selection: 'url' as const, value: { url: source } }
              : { selection: 'url' as const, value: { url: '' } },
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
      await storeJson.merge(effects, {
        modLoader: 'modpack',
        modpack: {
          source:
            source.selection === 'upload'
              ? source.value.file.path
              : source.value.url.trim(),
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
