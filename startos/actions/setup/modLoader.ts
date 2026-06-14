import {
  defaultModLoader,
  defaultModMinecraftVersion,
  storeJson,
} from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value, Variants } = sdk

// Modrinth project slugs, entered comma/space/newline-separated.
const parseMods = (raw: string | null): string[] =>
  (raw ?? '')
    .split(/[\s,]+/)
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0)

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
  mods: Value.text({
    name: i18n('Mods (Modrinth project slugs)'),
    description: i18n(
      'Comma- or newline-separated Modrinth project slugs to install, e.g. "giants-of-the-cretaceous". Required dependencies are downloaded automatically. Every client must install these same mods at the same versions.',
    ),
    required: false,
    default: null,
    placeholder: 'giants-of-the-cretaceous',
    masked: false,
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
          mods: store.mods.join('\n'),
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
      mods: parseMods(input.loader.value.mods),
    })
  },
)
