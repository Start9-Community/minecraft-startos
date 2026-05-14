import { rm } from 'node:fs/promises'
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

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === 'object' && error !== null && 'code' in error

const inputSpec = InputSpec.of({
  worldName: Value.dynamicSelect(async () => {
    const worldNames = await listWorldNames()

    if (worldNames.length === 0) {
      return {
        name: i18n('World Save'),
        description: i18n('No world saves are currently available to delete.'),
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
      description: i18n('Select the world save folder to permanently delete.'),
      warning: i18n('Deleting a world is permanent and cannot be undone.'),
      default: worldNames[0],
      values: toWorldSelectValues(worldNames),
      disabled: false,
    }
  }),
  confirmation: Value.text({
    name: i18n('Type DELETE to Confirm'),
    description: i18n(
      'This permanently deletes the selected world save folder.',
    ),
    required: true,
    default: '',
    placeholder: 'DELETE',
    masked: false,
  }),
})

export const deleteWorld = sdk.Action.withInput(
  'delete-world',
  async () => ({
    name: i18n('Delete World'),
    description: i18n(
      'Permanently delete an unused world save folder (service must be stopped)',
    ),
    warning: i18n(
      'This action permanently deletes world data and cannot be undone. Back up first if needed.',
    ),
    allowedStatuses: 'only-stopped',
    group: i18n('Worlds'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => undefined,
  async ({ input }) => {
    if (input.worldName === noWorldsOption) {
      return {
        version: '1',
        title: i18n('No Saved Worlds Found'),
        message: i18n('No world save folders were found to delete.'),
        result: null,
      }
    }

    if (input.confirmation.trim() !== 'DELETE') {
      return {
        version: '1',
        title: i18n('Confirmation Required'),
        message: i18n('Type DELETE exactly to confirm world deletion.'),
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

    if (input.worldName === props['level-name']) {
      return {
        version: '1',
        title: i18n('Cannot Delete Configured World'),
        message: i18n(
          'Use Select World to switch to a different world before deleting this one.',
        ),
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

    try {
      await rm(sdk.volumes.main.subpath(input.worldName), {
        recursive: true,
        force: false,
      })
    } catch (error) {
      if (isErrnoException(error) && error.code === 'ENOENT') {
        return {
          version: '1',
          title: i18n('World Not Found'),
          message: `World save "${input.worldName}" was not found.`,
          result: null,
        }
      }

      throw error
    }
  },
)
