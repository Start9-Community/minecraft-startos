import { sdk } from './sdk'
import type { T } from '@start9labs/start-sdk'
import { connectToRcon } from './rcon'

export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) =>
    sdk.Backups.ofVolumes('main').setPreBackup(async (backupEffects) => {
      await flushWorldBeforeBackup(backupEffects)
    }),
)

const flushWorldBeforeBackup = async (effects: T.Effects) => {
  const status = await sdk.getStatus(effects).once()

  if (!status?.started) return

  const rcon = await connectToRcon(effects, 3_000)
  if (!rcon.connection) {
    throw new Error(`Backup preflight save-all flush failed: ${rcon.error}`)
  }

  try {
    await rcon.connection.command('save-all flush', 5_000)
  } finally {
    rcon.connection.close()
  }
}
