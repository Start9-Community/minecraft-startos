import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { z } from '@start9labs/start-sdk'
import * as yauzl from 'yauzl'
import { uploadedModpackSubpath } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

const maximumUploadBytes = 512 * 1024 * 1024
const maximumIndexBytes = 16 * 1024 * 1024
const indexFilename = 'modrinth.index.json'

const nonEmptyString = z.string().min(1)
const environmentSupport = z.enum([
  'required',
  'optional',
  'unsupported',
  'unknown',
])
const safeRelativePath = nonEmptyString.refine((path) => {
  if (path.includes('\0') || path.startsWith('/') || path.startsWith('\\')) {
    return false
  }
  if (/^[A-Za-z]:[\\/]/.test(path)) return false
  return !path.replaceAll('\\', '/').split('/').includes('..')
})
const httpsUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  })
const modpackFileSchema = z
  .object({
    path: safeRelativePath,
    hashes: z
      .object({
        sha1: z.string().regex(/^[0-9a-f]{40}$/i),
        sha512: z.string().regex(/^[0-9a-f]{128}$/i),
      })
      .catchall(z.string()),
    downloads: z.array(httpsUrl).min(1),
    fileSize: z.number().int().nonnegative(),
    env: z
      .object({
        client: environmentSupport.optional(),
        server: environmentSupport.optional(),
      })
      .strict()
      .optional(),
  })
  .passthrough()
const dependenciesSchema = z
  .object({
    minecraft: nonEmptyString,
    forge: nonEmptyString.optional(),
    neoforge: nonEmptyString.optional(),
    'fabric-loader': nonEmptyString.optional(),
    'quilt-loader': nonEmptyString.optional(),
  })
  .strict()
const modpackIndexSchema = z
  .object({
    formatVersion: z.literal(1),
    game: z.literal('minecraft'),
    versionId: nonEmptyString,
    name: nonEmptyString,
    summary: z.string().optional(),
    files: z.array(modpackFileSchema),
    dependencies: dependenciesSchema,
  })
  .passthrough()
const installerManifestSchema = z
  .object({ files: z.array(safeRelativePath) })
  .passthrough()

const openZip = (path: string): Promise<yauzl.ZipFile> =>
  new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, zip) => {
      if (error || !zip) reject(error ?? new Error('Unable to open ZIP'))
      else resolve(zip)
    })
  })

const findIndexEntry = (zip: yauzl.ZipFile): Promise<yauzl.Entry> =>
  new Promise((resolve, reject) => {
    let index: yauzl.Entry | undefined
    zip.on('error', reject)
    zip.on('entry', (entry) => {
      if (entry.fileName === indexFilename) {
        if (index) {
          reject(new Error(`Duplicate ${indexFilename}`))
          return
        }
        index = entry
      }
      zip.readEntry()
    })
    zip.on('end', () => {
      if (index) resolve(index)
      else reject(new Error(`Missing ${indexFilename}`))
    })
    zip.readEntry()
  })

const readIndexEntry = (
  zip: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    if (entry.uncompressedSize > maximumIndexBytes) {
      reject(new Error(`${indexFilename} is too large`))
      return
    }
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error(`Unable to read ${indexFilename}`))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > maximumIndexBytes) {
          stream.destroy(new Error(`${indexFilename} is too large`))
        } else {
          chunks.push(chunk)
        }
      })
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  })

class UnsupportedModpackLoaderError extends Error {}

const validateModpack = async (path: string): Promise<void> => {
  let zip: yauzl.ZipFile | undefined
  try {
    zip = await openZip(path)
    const entry = await findIndexEntry(zip)
    const index: unknown = JSON.parse(
      (await readIndexEntry(zip, entry)).toString(),
    )
    const { dependencies } = modpackIndexSchema.parse(index)
    if (
      !dependencies.forge &&
      !dependencies.neoforge &&
      !dependencies['fabric-loader'] &&
      !dependencies['quilt-loader']
    ) {
      throw new UnsupportedModpackLoaderError()
    }
  } finally {
    zip?.close()
  }
}

const sha256File = async (path: string): Promise<string> => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

const isMissing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException).code === 'ENOENT'

export const removeTrackedMods = async (
  manifestName: '.modrinth-manifest.json' | '.modrinth-modpack-manifest.json',
): Promise<void> => {
  const volumeRoot = await fs.realpath(sdk.volumes.main.subpath(''))
  const manifestPath = resolve(volumeRoot, manifestName)
  const contents = await fs
    .readFile(manifestPath, 'utf8')
    .catch((error: unknown) => {
      if (isMissing(error)) return null
      throw error
    })
  if (contents === null) return

  let files: string[]
  try {
    files = installerManifestSchema.parse(JSON.parse(contents)).files
  } catch {
    throw new Error(`Invalid ${manifestName}: expected a safe files array`)
  }

  for (const file of files) {
    const normalized = file.replaceAll('\\', '/')
    if (!normalized.startsWith('mods/')) continue

    const target = resolve(volumeRoot, normalized)
    const fromRoot = relative(volumeRoot, target)
    if (isAbsolute(fromRoot) || fromRoot.startsWith(`..${sep}`)) {
      throw new Error(`Invalid ${manifestName}: tracked mod escapes the volume`)
    }

    const targetStat = await fs.lstat(target).catch((error: unknown) => {
      if (isMissing(error)) return null
      throw error
    })
    if (targetStat === null) continue
    if (!targetStat.isFile() && !targetStat.isSymbolicLink()) {
      throw new Error(`Invalid ${manifestName}: tracked mod is not a file`)
    }

    const actualParent = await fs.realpath(dirname(target))
    const parentFromRoot = relative(volumeRoot, actualParent)
    if (
      isAbsolute(parentFromRoot) ||
      parentFromRoot === '..' ||
      parentFromRoot.startsWith(`..${sep}`)
    ) {
      throw new Error(`Invalid ${manifestName}: tracked mod escapes the volume`)
    }
    await fs.rm(target, { force: true })
  }
}

export const replaceUploadedModpack = async (
  file: { path: string; commitment: { size: number } },
  persist: (uploadHash: string) => Promise<void>,
): Promise<void> => {
  if (file.commitment.size > maximumUploadBytes) {
    throw new Error(i18n('The uploaded modpack exceeds the 512 MiB limit.'))
  }

  const destination = sdk.volumes.main.subpath(uploadedModpackSubpath)
  const temporary = `${destination}.${randomUUID()}.tmp`
  const backup = `${destination}.${randomUUID()}.bak`
  let hasBackup = false
  let promoted = false

  await fs.mkdir(dirname(destination), { recursive: true })
  try {
    await fs.copyFile(file.path, temporary)
    const staged = await fs.stat(temporary)
    if (staged.size > maximumUploadBytes) {
      throw new Error(i18n('The uploaded modpack exceeds the 512 MiB limit.'))
    }
    if (!staged.isFile() || staged.size !== file.commitment.size) {
      throw new Error(
        i18n(
          'The uploaded file is not a valid Modrinth modpack. It must contain a valid root modrinth.index.json for Minecraft.',
        ),
      )
    }

    try {
      await validateModpack(temporary)
    } catch (error) {
      if (error instanceof UnsupportedModpackLoaderError) {
        throw new Error(
          i18n(
            'This Modrinth modpack has no supported mod loader. Choose a Forge, NeoForge, Fabric, or Quilt pack.',
          ),
        )
      }
      throw new Error(
        i18n(
          'The uploaded file is not a valid Modrinth modpack. It must contain a valid root modrinth.index.json for Minecraft.',
        ),
      )
    }
    const uploadHash = await sha256File(temporary)

    try {
      await fs.rename(destination, backup)
      hasBackup = true
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    await fs.rename(temporary, destination)
    promoted = true

    try {
      await persist(uploadHash)
    } catch (error) {
      promoted = false
      if (hasBackup) {
        try {
          await fs.rm(destination, { force: true })
        } finally {
          await fs.rename(backup, destination)
          hasBackup = false
        }
      } else {
        await fs.rm(destination, { force: true })
      }
      throw error
    }

    if (hasBackup) {
      await fs.rm(backup, { force: true })
      hasBackup = false
    }
  } finally {
    if (!promoted && hasBackup) {
      await fs.rename(backup, destination)
      hasBackup = false
    }
    await fs.rm(temporary, { force: true })
    if (!hasBackup) await fs.rm(backup, { force: true })
  }
}
