import { serverProperties } from '../../fileModels/server.properties'
import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

export const getServerInfo = sdk.Action.withoutInput(
  'get-server-info',
  async () => ({
    name: i18n('Get Server Info'),
    description: i18n('Display current server configuration and settings'),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Info'),
    visibility: 'enabled',
  }),
  async () => {
    const props = await serverProperties.read().once()
    const store = await storeJson.read().once()

    if (!props || !store) {
      return {
        version: '1',
        title: i18n('Error'),
        message: i18n('Configuration not found'),
        result: null,
      }
    }

    return {
      version: '1',
      title: i18n('Server Configuration'),
      message: null,
      result: {
        type: 'group',
        value: [
          {
            name: i18n('Game Mode'),
            description: null,
            type: 'single' as const,
            value: props.gamemode,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Difficulty'),
            description: null,
            type: 'single' as const,
            value: props.difficulty,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Memory Allocation'),
            description: null,
            type: 'single' as const,
            value: `${store.memory.initial} to ${store.memory.maximum}`,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Message of the Day'),
            description: null,
            type: 'single' as const,
            value: props.motd,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Max Players'),
            description: null,
            type: 'single' as const,
            value: props['max-players'].toString(),
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Whitelist Enabled'),
            description: null,
            type: 'single' as const,
            value: props['white-list'] ? i18n('Yes') : i18n('No'),
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Whitelisted Players'),
            description: null,
            type: 'single' as const,
            value:
              store.whitelist.length > 0
                ? store.whitelist.map((p) => p.name).join(', ')
                : i18n('None'),
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Username'),
            description: i18n(
              'Access the Web Admin UI through the "Web Admin" interface in StartOS.',
            ),
            type: 'single' as const,
            value: store.webAdminUsername,
            copyable: true,
            qr: false,
            masked: false,
          },
        ],
      },
    }
  },
)
