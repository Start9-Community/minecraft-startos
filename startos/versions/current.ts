import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:8',
  releaseNotes: {
    en_US: `- Set Web Admin Password asks for confirmation before replacing an existing password.
- Delete World opens with no world selected.
- Configure Server, Mod Loader, Manage Whitelist and the world actions explain each option in their field descriptions.`,
    es_ES: `- Set Web Admin Password pide confirmación antes de reemplazar una contraseña existente.
- Delete World se abre sin ningún mundo seleccionado.
- Configure Server, Mod Loader, Manage Whitelist y las acciones de mundos explican cada opción en las descripciones de sus campos.`,
    de_DE: `- „Set Web Admin Password“ fragt vor dem Ersetzen eines vorhandenen Passworts nach einer Bestätigung.
- „Delete World“ öffnet sich ohne ausgewählte Welt.
- „Configure Server“, „Mod Loader“, „Manage Whitelist“ und die Welt-Aktionen erklären jede Option in ihren Feldbeschreibungen.`,
    pl_PL: `- „Set Web Admin Password” prosi o potwierdzenie przed zastąpieniem istniejącego hasła.
- „Delete World” otwiera się bez zaznaczonego świata.
- „Configure Server”, „Mod Loader”, „Manage Whitelist” i akcje światów objaśniają każdą opcję w opisach pól.`,
    fr_FR: `- Set Web Admin Password demande une confirmation avant de remplacer un mot de passe existant.
- Delete World s'ouvre sans monde sélectionné.
- Configure Server, Mod Loader, Manage Whitelist et les actions de monde expliquent chaque option dans la description de leurs champs.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
