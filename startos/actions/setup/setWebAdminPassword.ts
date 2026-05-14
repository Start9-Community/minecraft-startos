import { utils } from '@start9labs/start-sdk'
import {
  defaultWebAdminUsername,
  storeJson,
} from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const passwordCharset = 'a-z,A-Z,1-9,!,@,$,%,&,*'
const passwordLength = 22

export const setWebAdminPassword = sdk.Action.withoutInput(
  'set-web-admin-password',
  async () => ({
    name: i18n('Set Web Admin Password'),
    description: i18n(
      'Generate a new random password for the RCON Web Admin UI. The service cannot start until a password has been set.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const password = utils.getDefaultString({
      charset: passwordCharset,
      len: passwordLength,
    })
    await storeJson.merge(effects, { webAdminPassword: password })

    return {
      version: '1',
      title: i18n('Web Admin Password Set'),
      message: i18n(
        'Your Web Admin password is shown below. Save it to a password manager before leaving this screen — it will not be retrievable again. The service is restarting to apply the new password.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single' as const,
            name: i18n('Username'),
            description: null,
            value: defaultWebAdminUsername,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
