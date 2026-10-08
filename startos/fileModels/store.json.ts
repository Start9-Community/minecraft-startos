import { z, FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const defaultInitialMemory = '1G'
export const defaultMaximumMemory = '2G'
export const defaultWebAdminUsername = 'admin'

export const modLoaderSchema = z.enum([
  'vanilla',
  'neoforge',
  'fabric',
  'modpack',
])
export type ModLoader = z.infer<typeof modLoaderSchema>
export const defaultModLoader: ModLoader = 'vanilla'
export const defaultModMinecraftVersion = '1.21.8'

export const javaVersionSchema = z.enum(['java25', 'java21', 'java17', 'java8'])
export type JavaVersion = z.infer<typeof javaVersionSchema>
export const defaultJavaVersion: JavaVersion = 'java21'

// A mod is a Modrinth project slug plus an optional version — a version
// number, a Modrinth version ID, or a release channel (release/beta/alpha).
// Older stores held a bare slug string; accept that and normalize it.
export const modEntrySchema = z
  .union([
    z.string(),
    z.looseObject({ slug: z.string(), version: z.string().optional() }),
  ])
  .transform((entry): { slug: string; version?: string } =>
    typeof entry === 'string' ? { slug: entry } : entry,
  )

export type ModEntry = z.infer<typeof modEntrySchema>

const memorySchema = z
  .looseObject({
    initial: z.string().catch(defaultInitialMemory),
    maximum: z.string().catch(defaultMaximumMemory),
  })
  .catch({
    initial: defaultInitialMemory,
    maximum: defaultMaximumMemory,
  })

export const uploadedModpackSubpath = 'start9/modpack.mrpack'
export const uploadedModpackPath = `/data/${uploadedModpackSubpath}`

const modpackSchema = z
  .looseObject({
    source: z.string().catch(''),
    excludeFiles: z.string().optional().catch(undefined),
    forceResync: z.boolean().catch(false),
    uploadHash: z.string().optional().catch(undefined),
  })
  .catch({
    source: '',
    excludeFiles: undefined,
    forceResync: false,
    uploadHash: undefined,
  })

const storeConfigSchema = z.looseObject({
  memory: memorySchema,
  webAdminUsername: z.string().catch(defaultWebAdminUsername),
  webAdminPassword: z.string().optional().catch(undefined),
  // Modded config (only used when modLoader !== 'vanilla'); see
  // actions/setup/modLoader.ts and main.ts.
  modLoader: modLoaderSchema.catch(defaultModLoader),
  javaVersion: javaVersionSchema.catch(defaultJavaVersion),
  modMinecraftVersion: z.string().catch(defaultModMinecraftVersion),
  loaderVersion: z.string().optional().catch(undefined),
  mods: z.array(modEntrySchema).catch([]),
  modpack: modpackSchema,
})

export type StoreConfig = z.infer<typeof storeConfigSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'start9/store.json' },
  storeConfigSchema,
)
