import {
  defaultWhitelistEnabled,
  serverProperties,
} from '../../fileModels/server.properties'
import { i18n } from '../../i18n'
import { connectToRcon } from '../../rcon'
import { sdk } from '../../sdk'

const { InputSpec, Value, List } = sdk

// Parse the server's `whitelist list` output into player names.
const parseWhitelist = (output: string): string[] => {
  if (/no whitelisted players/i.test(output)) return []
  const colon = output.indexOf(':')
  if (colon === -1) return []
  return output
    .slice(colon + 1)
    .split(/\s*,\s*/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

const inputSpec = InputSpec.of({
  enabled: Value.toggle({
    name: i18n('Enable Whitelist'),
    description: i18n('Only allow whitelisted players to join'),
    default: defaultWhitelistEnabled,
  }),
  players: Value.list(
    List.text(
      {
        name: i18n('Whitelisted Players'),
        description: i18n(
          'Minecraft usernames permitted to join when the whitelist is enforced.',
        ),
      },
      {
        placeholder: 'Steve',
        patterns: [
          {
            regex: '^[A-Za-z0-9_]{1,16}$',
            description: i18n(
              'Minecraft usernames are 1-16 characters: letters, numbers, and underscores.',
            ),
          },
        ],
      },
    ),
  ),
})

export const manageWhitelist = sdk.Action.withInput(
  'manage-whitelist',
  async () => ({
    name: i18n('Manage Whitelist'),
    description: i18n('View, add, remove, and enforce the player whitelist'),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => {
    const props = await serverProperties.read().once()
    const enabled = props?.['white-list'] ?? false
    const rcon = await connectToRcon(effects)
    if (!rcon.connection) return { enabled, players: [] }
    try {
      const output = await rcon.connection.command('whitelist list')
      return { enabled, players: parseWhitelist(output) }
    } finally {
      rcon.connection.close()
    }
  },
  async ({ effects, input }) => {
    const rcon = await connectToRcon(effects)
    if (!rcon.connection) {
      return {
        version: '1',
        title: i18n('Unable to Reach Server'),
        message: rcon.error,
        result: null,
      }
    }

    const connection = rcon.connection
    try {
      const current = new Set(
        parseWhitelist(await connection.command('whitelist list')),
      )
      const desired = new Set(
        input.players.map((name) => name.trim()).filter((name) => name.length),
      )

      // The server computes the mode-correct UUID for each name and rewrites
      // whitelist.json itself, so offline players actually match.
      for (const name of desired) {
        if (!current.has(name)) {
          await connection.command(`whitelist add ${name}`)
        }
      }
      for (const name of current) {
        if (!desired.has(name)) {
          await connection.command(`whitelist remove ${name}`)
        }
      }
      await connection.command(input.enabled ? 'whitelist on' : 'whitelist off')
      await connection.command('whitelist reload')
    } finally {
      connection.close()
    }

    // Persist the enabled flag: server.properties is the package's source of
    // truth on (re)start; the RCON commands above only changed the live state.
    await serverProperties.merge(effects, {
      'white-list': input.enabled,
      'enforce-whitelist': input.enabled,
    })
  },
)
