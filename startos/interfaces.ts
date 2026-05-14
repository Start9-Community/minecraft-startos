import { sdk } from './sdk'
import { i18n } from './i18n'
import { gamePort, webAdminProxyPort } from './utils'
import {
  defaultWebAdminUsername,
  storeJson,
} from './fileModels/store.json'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const webAdminUsername =
    (await storeJson.read((s) => s.webAdminUsername).const(effects)) ??
    defaultWebAdminUsername

  // Web Admin Interface
  const webAdminMulti = sdk.MultiHost.of(effects, 'web-admin-multi')
  const webAdminOrigin = await webAdminMulti.bindPort(webAdminProxyPort, {
    protocol: 'http',
  })
  const webAdminInterface = sdk.createInterface(effects, {
    name: i18n('RCON Web Admin'),
    id: 'web-admin',
    description: i18n('RCON-based web administration interface'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: webAdminUsername,
    path: '',
    query: {},
  })
  const webAdminReceipt = await webAdminOrigin.export([webAdminInterface])

  // Minecraft Game Server Interface
  const minecraftMulti = sdk.MultiHost.of(effects, 'minecraft-multi')
  const minecraftOrigin = await minecraftMulti.bindPort(gamePort, {
    protocol: null,
    preferredExternalPort: gamePort,
    addSsl: null,
    secure: { ssl: false },
  })
  const minecraftInterface = sdk.createInterface(effects, {
    name: i18n('Minecraft Server'),
    id: 'minecraft-server',
    description: i18n('Minecraft game server connection (Java Edition)'),
    type: 'p2p',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })
  const minecraftReceipt = await minecraftOrigin.export([minecraftInterface])

  return [webAdminReceipt, minecraftReceipt]
})
