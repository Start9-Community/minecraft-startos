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

// A mod is a Modrinth project slug plus an optional version — a version
// number, a Modrinth version ID, or a release channel (release/beta/alpha).
// Older stores held a bare slug string; accept that and normalize it.
export const modEntrySchema = z
  .union([
    z.string(),
    z.object({ slug: z.string(), version: z.string().optional() }),
  ])
  .transform((entry): { slug: string; version?: string } =>
    typeof entry === 'string' ? { slug: entry } : entry,
  )

export type ModEntry = z.infer<typeof modEntrySchema>

const memorySchema = z
  .object({
    initial: z.string().catch(defaultInitialMemory),
    maximum: z.string().catch(defaultMaximumMemory),
  })
  .catch({
    initial: defaultInitialMemory,
    maximum: defaultMaximumMemory,
  })

// A Modrinth modpack, either uploaded or named by URL/slug. The image
// resolves it, and — unlike the per-mod path — the *pack* decides the
// Minecraft version and the loader build, so neither is stored alongside it.
export const modpackSchema = z
  .object({
    // A container path to an uploaded .mrpack, or a Modrinth slug, project
    // URL, version URL, or direct .mrpack URL. Passed to MODRINTH_MODPACK
    // verbatim; the image accepts all of these forms.
    source: z.string().catch(''),
    // Files to leave out, for packs that mark a client mod server-compatible.
    // Newline or comma delimited; see MODRINTH_EXCLUDE_FILES.
    excludeFiles: z.string().optional().catch(undefined),
    // Re-fetch and re-apply the pack even if it looks unchanged.
    //
    // The image identifies a URL-sourced pack by the URL itself (base64 of it),
    // not by its contents, so re-publishing an edited pack at the same address
    // is invisible: the install step is skipped entirely, which also means
    // excludeFiles is never evaluated. This forces the issue.
    forceResync: z.boolean().catch(false),
  })
  .catch({ source: '', excludeFiles: undefined, forceResync: false })

export type Modpack = z.infer<typeof modpackSchema>

const storeConfigSchema = z.object({
  memory: memorySchema,
  webAdminUsername: z.string().catch(defaultWebAdminUsername),
  webAdminPassword: z.string().optional().catch(undefined),
  // Modded config (only used when modLoader !== 'vanilla'); see
  // actions/setup/modLoader.ts and main.ts.
  modLoader: modLoaderSchema.catch(defaultModLoader),
  modMinecraftVersion: z.string().catch(defaultModMinecraftVersion),
  mods: z.array(modEntrySchema).catch([]),
  // Only used when modLoader === 'modpack'.
  modpack: modpackSchema,
})

export type StoreConfig = z.infer<typeof storeConfigSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'start9/store.json' },
  storeConfigSchema,
)
