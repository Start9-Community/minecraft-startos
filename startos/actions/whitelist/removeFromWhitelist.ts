import { serverProperties } from '../../fileModels/server.properties'
import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  name: Value.text({
    name: i18n('Player Name'),
    description: i18n('Minecraft username to remove from whitelist'),
    required: true,
    default: '',
    placeholder: 'Steve',
    masked: false,
  }),
})

export const removeFromWhitelist = sdk.Action.withInput(
  'remove-from-whitelist',
  async () => ({
    name: i18n('Remove from Whitelist'),
    description: i18n('Remove a player from the server whitelist'),
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
    if (!existingPlayer) {
      return {
        version: '1',
        title: i18n('Player Not Found'),
        message: `${input.name} is not on the whitelist.`,
        result: null,
      }
    }

    const updatedWhitelist = store.whitelist.filter(
      (p) => p.name !== input.name,
    )
    const shouldDisable = props['white-list'] && updatedWhitelist.length === 0

    await storeJson.merge(effects, { whitelist: updatedWhitelist })

    if (shouldDisable) {
      await serverProperties.merge(effects, {
        'white-list': false,
        'enforce-whitelist': false,
      })
    }

    if (shouldDisable) {
      return {
        version: '1',
        title: i18n('Whitelist Disabled'),
        message: i18n(
          'Removing the last player automatically disabled the whitelist. Any player can now join.',
        ),
        result: null,
      }
    }
  },
)
