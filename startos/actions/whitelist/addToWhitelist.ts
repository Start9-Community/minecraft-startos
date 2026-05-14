import { serverProperties } from '../../fileModels/server.properties'
import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  name: Value.text({
    name: i18n('Player Name'),
    description: i18n('Minecraft username to whitelist'),
    required: true,
    default: '',
    placeholder: 'Steve',
    masked: false,
  }),
  uuid: Value.text({
    name: i18n('Player UUID (Optional)'),
    description: i18n(
      'Minecraft player UUID (optional, leave blank if unknown)',
    ),
    required: false,
    default: '',
    placeholder: '',
    masked: false,
  }),
})

export const addToWhitelist = sdk.Action.withInput(
  'add-to-whitelist',
  async () => ({
    name: i18n('Add to Whitelist'),
    description: i18n('Add a player to the server whitelist'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Whitelist'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => undefined,
  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const props = await serverProperties.read().once()

    if (!store || !props) {
      return {
        version: '1',
        title: i18n('Error'),
        message: i18n('Configuration not found'),
        result: null,
      }
    }

    const existingPlayer = store.whitelist.find((p) => p.name === input.name)
    if (existingPlayer) {
      return {
        version: '1',
        title: i18n('Player Already Whitelisted'),
        message: `${input.name} is already on the whitelist.`,
        result: null,
      }
    }

    const wasEnabled = props['white-list']

    await storeJson.merge(effects, {
      whitelist: [
        ...store.whitelist,
        { name: input.name, uuid: input.uuid || undefined },
      ],
    })

    await serverProperties.merge(effects, {
      'white-list': true,
      'enforce-whitelist': true,
    })

    if (!wasEnabled) {
      return {
        version: '1',
        title: i18n('Whitelist Enabled'),
        message: i18n(
          'Adding the first player automatically enabled the whitelist. Only whitelisted players can now join.',
        ),
        result: null,
      }
    }
  },
)
