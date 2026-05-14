import {
  defaultLevelName,
  serverProperties,
} from '../../fileModels/server.properties'
import { i18n } from '../../i18n'
import { sdk } from '../../sdk'
import { listWorldSummaries } from '../../worlds'

const toSingle = (
  name: string,
  value: string,
  description: string | null = null,
) => ({
  name,
  description,
  type: 'single' as const,
  value,
  copyable: false,
  qr: false,
  masked: false,
})

const formatDate = (value: Date | null): string =>
  value
    ? value
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC')
    : i18n('Unknown')

const formatBoolean = (value: boolean | null): string =>
  value === null ? i18n('Unknown') : value ? i18n('Yes') : i18n('No')

const toWorldDetailRows = (
  world: Awaited<ReturnType<typeof listWorldSummaries>>[number],
  index: number,
  configuredWorld: string,
) => {
  const worldPrefix = `World ${index + 1} (${world.name})`

  return [
    toSingle(
      worldPrefix,
      world.name === configuredWorld
        ? i18n('Configured world')
        : i18n('Saved world'),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Created (Filesystem)')}`,
      formatDate(world.createdAt),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Last Modified')}`,
      formatDate(world.modifiedAt),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Last Played')}`,
      formatDate(world.lastPlayedAt),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Game Mode')}`,
      world.gameMode ?? i18n('Unknown'),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Difficulty')}`,
      world.difficulty ?? i18n('Unknown'),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Hardcore')}`,
      formatBoolean(world.hardcore),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Cheats Enabled')}`,
      formatBoolean(world.cheatsEnabled),
    ),
    toSingle(
      `${worldPrefix} - ${i18n('Minecraft Version')}`,
      world.minecraftVersion ?? i18n('Unknown'),
    ),
    ...(world.metadataError
      ? [
          toSingle(
            `${worldPrefix} - ${i18n('Metadata Status')}`,
            world.metadataError,
          ),
        ]
      : []),
  ]
}

export const listWorlds = sdk.Action.withoutInput(
  'list-worlds',
  async () => ({
    name: i18n('List Worlds'),
    description: i18n(
      'List saved worlds with metadata and show which world is currently configured',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Worlds'),
    visibility: 'enabled',
  }),
  async () => {
    const props = await serverProperties.read().once()
    const configuredWorld = props?.['level-name'] ?? defaultLevelName
    const worlds = await listWorldSummaries()
    const hasConfiguredWorld = worlds.some(
      (world) => world.name === configuredWorld,
    )

    if (worlds.length === 0) {
      return {
        version: '1',
        title: i18n('No Saved Worlds Found'),
        message: i18n(
          'No world save folders were detected yet. Use Create World to stage a new world, then start the service to generate it.',
        ),
        result: {
          type: 'group',
          value: [
            toSingle(
              i18n('Configured World'),
              configuredWorld,
              i18n('This is the world that will load on next start.'),
            ),
          ],
        },
      }
    }

    return {
      version: '1',
      title: i18n('World List'),
      message: hasConfiguredWorld
        ? i18n('Saved world metadata from persistent storage.')
        : i18n(
            'Configured World does not match an existing save folder. Starting the server will create a new world with that name.',
          ),
      result: {
        type: 'group',
        value: [
          toSingle(
            i18n('Configured World'),
            configuredWorld,
            hasConfiguredWorld
              ? i18n('This world will load when the server starts.')
              : i18n('No matching folder exists yet.'),
          ),
          ...worlds.flatMap((world, index) =>
            toWorldDetailRows(world, index, configuredWorld),
          ),
        ],
      },
    }
  },
)
