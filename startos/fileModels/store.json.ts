import { z, FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const defaultInitialMemory = '1G'
export const defaultMaximumMemory = '2G'
export const defaultWebAdminUsername = 'admin'

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
})

export type StoreConfig = z.infer<typeof storeConfigSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'start9/store.json' },
  storeConfigSchema,
)
