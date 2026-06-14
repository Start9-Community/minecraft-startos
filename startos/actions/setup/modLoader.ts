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
})

const inputSpec = InputSpec.of({
  loader: Value.union({
    name: i18n('Mod Loader'),
    description: i18n(
      'Vanilla runs the latest Minecraft with no mods. NeoForge or Fabric run an older, mod-compatible Minecraft on a Java 21 runtime and let you install mods.',
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
