import {
  defaultAllowFlight,
  defaultDifficulty,
  defaultGameMode,
  defaultHardcore,
  defaultMaxPlayers,
  defaultMotd,
  defaultOnlineMode,
  defaultPauseWhenEmptySeconds,
  defaultPvp,
  defaultSimulationDistance,
  defaultSpawnProtection,
  defaultViewDistance,
  defaultWhitelistEnabled,
  serverProperties,
} from '../../fileModels/server.properties'
import {
  defaultInitialMemory,
  defaultMaximumMemory,
  storeJson,
} from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value, Variants } = sdk

type MemoryConfig = {
  initial: string
  maximum: string
}

const memoryProfiles = {
  starter: { initial: '1G', maximum: '2G' },
  standard: { initial: '2G', maximum: '4G' },
  high: { initial: '4G', maximum: '6G' },
} as const

type MemoryProfileId = keyof typeof memoryProfiles
type MemoryVariantId = MemoryProfileId | 'custom'

const minimumMemoryGiB = 1
const maximumMemoryGiB = 64
const defaultCustomInitialGiB = 1
const defaultCustomMaximumGiB = 2

const normalizeMemoryString = (value: string) => value.trim().toUpperCase()

const parseMemoryToGiB = (value: string): number | null => {
  const normalized = normalizeMemoryString(value)
  const match = normalized.match(/^(\d+)([MG])$/)
  if (!match) return null

  const amount = Number.parseInt(match[1], 10)
  if (Number.isNaN(amount) || amount <= 0) return null

  if (match[2] === 'G') return amount
  return Math.ceil(amount / 1024)
}

const clampGiB = (value: number): number =>
  Math.min(maximumMemoryGiB, Math.max(minimumMemoryGiB, value))

const memoryFromGiB = (valueGiB: number): string => `${valueGiB}G`

const detectMemoryVariant = (memory: MemoryConfig): MemoryVariantId => {
  const initial = normalizeMemoryString(memory.initial)
  const maximum = normalizeMemoryString(memory.maximum)

  for (const [profileId, profile] of Object.entries(memoryProfiles) as [
    MemoryProfileId,
    MemoryConfig,
  ][]) {
    if (initial === profile.initial && maximum === profile.maximum) {
      return profileId
    }
  }

  return 'custom'
}

const toCustomMemoryPrefill = (memory: MemoryConfig) => ({
  initialGiB: clampGiB(
    parseMemoryToGiB(memory.initial) ?? defaultCustomInitialGiB,
  ),
  maximumGiB: clampGiB(
    parseMemoryToGiB(memory.maximum) ?? defaultCustomMaximumGiB,
  ),
})

const detectedDefaultMemoryVariant = detectMemoryVariant({
  initial: defaultInitialMemory,
  maximum: defaultMaximumMemory,
})
const defaultMemoryVariant: MemoryVariantId =
  detectedDefaultMemoryVariant === 'custom'
    ? 'starter'
    : detectedDefaultMemoryVariant

const memoryVariants = Variants.of({
  starter: {
    name: i18n(
      'Starter (Recommended) — 1G initial / 2G max (best for 1-5 players)',
    ),
    spec: InputSpec.of({}),
  },
  standard: {
    name: i18n('Standard — 2G initial / 4G max (best for 5-10 players)'),
    spec: InputSpec.of({}),
  },
  high: {
    name: i18n(
      'High — 4G initial / 6G max (for heavier worlds or >10 players)',
    ),
    spec: InputSpec.of({}),
  },
  custom: {
    name: i18n('Custom (Advanced)'),
    spec: InputSpec.of({
      initialGiB: Value.number({
        name: i18n('Starting Memory'),
        description: i18n(
          'Initial Java heap size in GiB. This is where Java starts before growing.',
        ),
        required: true,
        default: defaultCustomInitialGiB,
        integer: true,
        min: minimumMemoryGiB,
        max: maximumMemoryGiB,
        step: 1,
        units: 'GiB',
      }),
      maximumGiB: Value.number({
        name: i18n('Maximum Memory'),
        description: i18n(
          'Maximum Java heap size in GiB. Keep this at or above Starting Memory.',
        ),
        required: true,
        default: defaultCustomMaximumGiB,
        integer: true,
        min: minimumMemoryGiB,
        max: maximumMemoryGiB,
        step: 1,
        units: 'GiB',
      }),
    }),
  },
})

const inputSpec = InputSpec.of({
  gameMode: Value.select({
    name: i18n('Game Mode'),
    description: i18n('Select the default game mode for players'),
    default: defaultGameMode,
    values: {
      survival: i18n('Survival'),
      creative: i18n('Creative'),
      adventure: i18n('Adventure'),
      spectator: i18n('Spectator'),
    },
  }),
  difficulty: Value.select({
    name: i18n('Difficulty'),
    description: i18n('Server difficulty level'),
    default: defaultDifficulty,
    values: {
      peaceful: i18n('Peaceful'),
      easy: i18n('Easy'),
      normal: i18n('Normal'),
      hard: i18n('Hard'),
    },
  }),
  memory: Value.union({
    name: i18n('Memory Allocation'),
    description: i18n(
      'Pick a preset profile or choose Custom. Most vanilla servers run well with Starter or Standard.',
    ),
    default: defaultMemoryVariant,
    variants: memoryVariants,
  }),
  maxPlayers: Value.number({
    name: i18n('Max Players'),
    description: i18n('Maximum number of players that can join'),
    required: true,
    default: defaultMaxPlayers,
    integer: true,
    min: 1,
    max: 10000,
  }),
  viewDistance: Value.number({
    name: i18n('View Distance'),
    description: i18n(
      'How many chunks players can see in each direction. Higher values use more CPU and RAM.',
    ),
    required: true,
    default: defaultViewDistance,
    integer: true,
    min: 2,
    max: 32,
    step: 1,
    units: 'chunks',
  }),
  simulationDistance: Value.number({
    name: i18n('Simulation Distance'),
    description: i18n(
      'How many chunks are actively ticking (redstone, mobs, crop growth). Keep at or below View Distance.',
    ),
    required: true,
    default: defaultSimulationDistance,
    integer: true,
    min: 2,
    max: 32,
    step: 1,
    units: 'chunks',
  }),
  onlineMode: Value.toggle({
    name: i18n('Online Mode'),
    description: i18n(
      'Require Mojang account authentication for joining players. Strongly recommended for public servers.',
    ),
    default: defaultOnlineMode,
  }),
  pvp: Value.toggle({
    name: i18n('Player-vs-Player (PvP)'),
    description: i18n('Allow players to damage each other.'),
    default: defaultPvp,
  }),
  allowFlight: Value.toggle({
    name: i18n('Allow Flight'),
    description: i18n(
      'Allow player flight. Useful for modded clients; also prevents accidental kicks from anti-flying checks.',
    ),
    default: defaultAllowFlight,
  }),
  hardcore: Value.toggle({
    name: i18n('Hardcore Mode'),
    description: i18n(
      'Enable hardcore gameplay rules. Intended for permanent-death style servers.',
    ),
    default: defaultHardcore,
  }),
  spawnProtection: Value.number({
    name: i18n('Spawn Protection Radius'),
    description: i18n(
      'Radius around world spawn where non-ops cannot build/break. Set to 0 to disable.',
    ),
    required: true,
    default: defaultSpawnProtection,
    integer: true,
    min: 0,
    max: 512,
    step: 1,
    units: 'blocks',
  }),
  pauseWhenEmptySeconds: Value.number({
    name: i18n('Pause When Empty (seconds)'),
    description: i18n(
      'When no players are online, pause world ticking after this many seconds. Set to 0 or -1 to disable.',
    ),
    required: true,
    default: defaultPauseWhenEmptySeconds,
    integer: true,
    min: -1,
    max: 86400,
    step: 1,
    units: 'seconds',
  }),
  motd: Value.text({
    name: i18n('Message of the Day (MOTD)'),
    description: i18n('Server description shown in the server list'),
    required: true,
    default: defaultMotd,
    placeholder: defaultMotd,
    masked: false,
  }),
  whitelistEnabled: Value.toggle({
    name: i18n('Enable Whitelist'),
    description: i18n('Only allow whitelisted players to join'),
    default: defaultWhitelistEnabled,
  }),
})

export const configureServer = sdk.Action.withInput(
  'configure-server',
  async () => ({
    name: i18n('Configure Server'),
    description: i18n('Configure your Minecraft server settings'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => {
    const props = await serverProperties.read().once()
    const store = await storeJson.read().once()
    if (!props || !store) return {}

    const memoryVariant = detectMemoryVariant(store.memory)

    return {
      gameMode: props.gamemode,
      difficulty: props.difficulty,
      memory:
        memoryVariant === 'custom'
          ? {
              selection: 'custom' as const,
              value: toCustomMemoryPrefill(store.memory),
            }
          : {
              selection: memoryVariant,
              value: {},
            },
      maxPlayers: props['max-players'],
      viewDistance: props['view-distance'],
      simulationDistance: props['simulation-distance'],
      onlineMode: props['online-mode'],
      pvp: props.pvp,
      allowFlight: props['allow-flight'],
      hardcore: props.hardcore,
      spawnProtection: props['spawn-protection'],
      pauseWhenEmptySeconds: props['pause-when-empty-seconds'],
      motd: props.motd,
      whitelistEnabled: props['white-list'],
    }
  },
  async ({ effects, input }) => {
    let resolvedMemory: MemoryConfig
    if (input.memory.selection === 'custom') {
      const initialGiB = input.memory.value.initialGiB
      const maximumGiB = input.memory.value.maximumGiB

      if (maximumGiB < initialGiB) {
        return {
          version: '1',
          title: i18n('Invalid Memory Configuration'),
          message: i18n(
            'Maximum Memory must be greater than or equal to Starting Memory.',
          ),
          result: null,
        }
      }

      resolvedMemory = {
        initial: memoryFromGiB(initialGiB),
        maximum: memoryFromGiB(maximumGiB),
      }
    } else {
      resolvedMemory = memoryProfiles[input.memory.selection]
    }

    await storeJson.merge(effects, { memory: resolvedMemory })

    await serverProperties.merge(effects, {
      gamemode: input.gameMode,
      difficulty: input.difficulty,
      'max-players': input.maxPlayers,
      'view-distance': input.viewDistance,
      'simulation-distance': input.simulationDistance,
      'online-mode': input.onlineMode,
      pvp: input.pvp,
      'allow-flight': input.allowFlight,
      hardcore: input.hardcore,
      'spawn-protection': input.spawnProtection,
      'pause-when-empty-seconds': input.pauseWhenEmptySeconds,
      motd: input.motd,
      'white-list': input.whitelistEnabled,
      'enforce-whitelist': input.whitelistEnabled,
    })
  },
)
