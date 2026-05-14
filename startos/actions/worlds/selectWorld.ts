import { serverProperties } from '../../fileModels/server.properties'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'
import { listWorldNames } from '../../worlds'

const { InputSpec, Value } = sdk

const noWorldsOption = '__no-worlds__'

const toWorldSelectValues = (worldNames: string[]) =>
  worldNames.reduce<Record<string, string>>((values, worldName) => {
    values[worldName] = worldName
    return values
  }, {})

const inputSpec = InputSpec.of({
  worldName: Value.dynamicSelect(async () => {
    const worldNames = await listWorldNames()

    if (worldNames.length === 0) {
      return {
        name: i18n('World Save'),
        description: i18n(
          'No existing world save folders were found. Start the server once to create one.',
        ),
        warning: null,
        default: noWorldsOption,
        values: {
          [noWorldsOption]: i18n('No world saves found'),
        },
        disabled: i18n('No world saves found.'),
      }
    }

    return {
      name: i18n('World Save'),
      description: i18n(
        'Select which existing world save to use as the configured world.',
      ),
      warning: null,
      default: worldNames[0],
      values: toWorldSelectValues(worldNames),
      disabled: false,
    }
  }),
})

export const selectWorld = sdk.Action.withInput(
  'select-world',
  async () => ({
    name: i18n('Select World'),
    description: i18n('Switch the configured world to an existing saved world'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Worlds'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => undefined,
  async ({ effects, input }) => {
    if (input.worldName === noWorldsOption) {
      return {
        version: '1',
        title: i18n('No Saved Worlds Found'),
        message: i18n(
          'No existing world save folders were found. Start the server once to create one.',
        ),
        result: null,
      }
    }

    const props = await serverProperties.read().once()
    if (!props) {
      return {
        version: '1',
        title: i18n('Error'),
        message: i18n('Configuration not found.'),
        result: null,
      }
    }

    if (props['level-name'] === input.worldName) {
      return {
        version: '1',
        title: i18n('World Already Selected'),
        message: `"${input.worldName}" is already the configured world.`,
        result: null,
      }
    }

    const worldNames = await listWorldNames()
    if (!worldNames.includes(input.worldName)) {
      return {
        version: '1',
        title: i18n('World Not Found'),
        message: `World save "${input.worldName}" was not found.`,
        result: null,
      }
    }

    await serverProperties.merge(effects, {
      'level-name': input.worldName,
    })

    await effects.restart()
  },
)
