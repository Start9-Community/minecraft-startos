import { z, FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const defaultInitialMemory = '1G'
export const defaultMaximumMemory = '2G'
export const defaultWebAdminUsername = 'admin'

export const modLoaderSchema = z.enum(['vanilla', 'neoforge', 'fabric'])
export type ModLoader = z.infer<typeof modLoaderSchema>
export const defaultModLoader: ModLoader = 'vanilla'
export const defaultModMinecraftVersion = '1.21.8'

export type WhitelistEntry = {
  name: string
  uuid?: string
}

const whitelistEntrySchema = z.object({
  name: z.string(),
  uuid: z.string().optional().catch(undefined),
})

const memorySchema = z
  .object({
    initial: z.string().catch(defaultInitialMemory),
    maximum: z.string().catch(defaultMaximumMemory),
  })
  .catch({
    initial: defaultInitialMemory,
    maximum: defaultMaximumMemory,
  })

const storeConfigSchema = z.object({
  memory: memorySchema,
  whitelist: z.array(whitelistEntrySchema).catch([]),
  webAdminUsername: z.string().catch(defaultWebAdminUsername),
  webAdminPassword: z.string().optional().catch(undefined),
  // Modded config (only used when modLoader !== 'vanilla'); see
  // actions/setup/modLoader.ts and main.ts. mods are Modrinth project slugs.
  modLoader: modLoaderSchema.catch(defaultModLoader),
  modMinecraftVersion: z.string().catch(defaultModMinecraftVersion),
  mods: z.array(z.string()).catch([]),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'start9/store.json' },
  storeConfigSchema,
)
