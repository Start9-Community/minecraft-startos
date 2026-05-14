import { utils } from '@start9labs/start-sdk'
import { setWebAdminPassword } from '../actions/setup/setWebAdminPassword'
import { serverProperties } from '../fileModels/server.properties'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  // Seed defaults on every init so new schema defaults are picked up on
  // upgrades. Existing values are preserved by the merge.
  await storeJson.merge(effects, {})
  await serverProperties.merge(effects, {})

  if (kind !== 'install') return

  // Generate the internal RCON password once. The web admin password is
  // user-supplied via setWebAdminPassword.
  await serverProperties.merge(effects, {
    'rcon.password': utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    }),
  })

  // Critical task — blocks service start until the user sets a password.
  await sdk.action.createOwnTask(effects, setWebAdminPassword, 'critical', {
    reason: i18n('Set a Web Admin password before starting the server'),
  })
})
