import { sdk } from '../sdk'
import { getLiveServerStats } from './info/getLiveServerStats'
import { configureServer } from './setup/configureServer'
import { getServerInfo } from './setup/getServerInfo'
import { modLoader } from './setup/modLoader'
import { setWebAdminPassword } from './setup/setWebAdminPassword'
import { addToWhitelist } from './whitelist/addToWhitelist'
import { removeFromWhitelist } from './whitelist/removeFromWhitelist'
import { createWorld } from './worlds/createWorld'
import { deleteWorld } from './worlds/deleteWorld'
import { listWorlds } from './worlds/listWorlds'
import { selectWorld } from './worlds/selectWorld'

export const actions = sdk.Actions.of()
  .addAction(configureServer)
  .addAction(modLoader)
  .addAction(listWorlds)
  .addAction(createWorld)
  .addAction(selectWorld)
  .addAction(deleteWorld)
  .addAction(setWebAdminPassword)
  .addAction(getServerInfo)
  .addAction(getLiveServerStats)
  .addAction(addToWhitelist)
  .addAction(removeFromWhitelist)
