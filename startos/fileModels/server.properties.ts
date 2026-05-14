import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { gamePort, rconPort } from '../utils'

export const defaultGameMode = 'survival' as const
export const defaultDifficulty = 'normal' as const
export const defaultLevelName = 'world'
export const defaultLevelSeed = ''
export const defaultViewDistance = 10
export const defaultSimulationDistance = 10
export const defaultOnlineMode = true
export const defaultPvp = true
export const defaultAllowFlight = false
export const defaultHardcore = false
export const defaultWhitelistEnabled = false
export const defaultSpawnProtection = 16
export const defaultMotd = 'A Minecraft Server on StartOS'
export const defaultMaxPlayers = 20
export const defaultPauseWhenEmptySeconds = 60

// `ini` parses unquoted numeric values as strings; coerce on read.
const iniNum = z.preprocess(
  (v) => (typeof v === 'string' ? Number(v) : v),
  z.number(),
)

const enforcedNum = <T extends number>(value: T) =>
  iniNum.pipe(z.literal(value)).catch(value)

const shape = z.object({
  // Mutable gameplay/world settings (server.properties keys are kebab-case).
  gamemode: z
    .enum(['survival', 'creative', 'adventure', 'spectator'])
    .catch(defaultGameMode),
  difficulty: z
    .enum(['peaceful', 'easy', 'normal', 'hard'])
    .catch(defaultDifficulty),
  'level-name': z.string().min(1).catch(defaultLevelName),
  'level-seed': z.string().catch(defaultLevelSeed),
  'view-distance': iniNum
    .pipe(z.number().int().min(2).max(32))
    .catch(defaultViewDistance),
  'simulation-distance': iniNum
    .pipe(z.number().int().min(2).max(32))
    .catch(defaultSimulationDistance),
  'online-mode': z.boolean().catch(defaultOnlineMode),
  pvp: z.boolean().catch(defaultPvp),
  'allow-flight': z.boolean().catch(defaultAllowFlight),
  hardcore: z.boolean().catch(defaultHardcore),
  'white-list': z.boolean().catch(defaultWhitelistEnabled),
  'enforce-whitelist': z.boolean().catch(defaultWhitelistEnabled),
  'spawn-protection': iniNum
    .pipe(z.number().int().min(0))
    .catch(defaultSpawnProtection),
  motd: z.string().catch(defaultMotd),
  'max-players': iniNum.pipe(z.number().int().min(1)).catch(defaultMaxPlayers),
  'pause-when-empty-seconds': iniNum
    .pipe(z.number().int().min(-1))
    .catch(defaultPauseWhenEmptySeconds),

  // Locked-down: enforced on every read; user edits are reverted.
  'enable-rcon': z.literal(true).catch(true),
  'rcon.port': enforcedNum(rconPort),
  'server-port': enforcedNum(gamePort),

  // Auto-generated on install. Required by the rcon-web-admin sidecar.
  'rcon.password': z.string().min(1).catch(''),
})

export type ServerProperties = z.infer<typeof shape>

export const serverProperties = FileHelper.ini(
  { base: sdk.volumes.main, subpath: 'server.properties' },
  shape,
)
