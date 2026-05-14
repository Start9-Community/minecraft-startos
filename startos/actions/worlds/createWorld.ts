import { serverProperties } from '../../fileModels/server.properties'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'
import { listWorldNames } from '../../worlds'

const { InputSpec, Value } = sdk

const maxWorldNameLength = 128
const invalidWorldNamePattern = /[\/\\\0]/

const isValidWorldName = (worldName: string): boolean =>
  worldName.length > 0 &&
  worldName.length <= maxWorldNameLength &&
  worldName !== '.' &&
  worldName !== '..' &&
  !invalidWorldNamePattern.test(worldName)

const inputSpec = InputSpec.of({
  worldName: Value.text({
    name: i18n('New World Name'),
    description: i18n(
      'Name for the new world save folder. Use a unique name to avoid overwriting or confusion.',
    ),
    required: true,
    default: '',
    placeholder: 'my-new-world',
    masked: false,
  }),
  levelSeed: Value.text({
    name: i18n('World Seed (Optional)'),
    description: i18n(
      'Seed used when generating this new world. Leave blank for random.',
    ),
    required: false,
    default: null,
    placeholder: i18n('Leave blank for random'),
    masked: false,
  }),
})

export const createWorld = sdk.Action.withInput(
  'create-world',
  async () => ({
    name: i18n('Create World'),
    description: i18n(
      'Create a new world by selecting a new world name and optional seed',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Worlds'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => undefined,
  async ({ effects, input }) => {
    const worldName = input.worldName.trim()
    const worldSeed = input.levelSeed?.trim() ?? ''

    if (!isValidWorldName(worldName)) {
      return {
        version: '1',
        title: i18n('Invalid World Name'),
        message: i18n(
          'World name must be 1-128 characters, cannot be "." or "..", and cannot contain slashes.',
        ),
        result: null,
      }
    }

    const worldNames = await listWorldNames()
    if (worldNames.includes(worldName)) {
      return {
        version: '1',
        title: i18n('World Already Exists'),
        message: i18n(
          'A saved world with this name already exists. Use Select World to switch to it.',
        ),
        result: null,
      }
    }

    await serverProperties.merge(effects, {
      'level-name': worldName,
      'level-seed': worldSeed,
    })

    await effects.restart()
  },
)
