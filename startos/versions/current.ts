import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:8',
  releaseNotes: {
    en_US: `Mod Loader can pin the NeoForge or Fabric Loader build for NeoForge and Fabric servers. Leaving it empty keeps installing the newest build.

- Set Web Admin Password asks for confirmation before replacing an existing password.
- Delete World opens with no world selected.
- Configure Server, Mod Loader, Manage Whitelist and the world actions explain each option in their field descriptions.`,
    es_ES: `El cargador de mods puede fijar la versión de NeoForge o de Fabric Loader en los servidores NeoForge y Fabric. Si se deja vacía, se sigue instalando la versión más reciente.

- Set Web Admin Password pide confirmación antes de reemplazar una contraseña existente.
- Delete World se abre sin ningún mundo seleccionado.
- Configure Server, Mod Loader, Manage Whitelist y las acciones de mundos explican cada opción en las descripciones de sus campos.`,
    de_DE: `Der Mod-Loader kann für NeoForge- und Fabric-Server die NeoForge- bzw. Fabric-Loader-Version festlegen. Bleibt das Feld leer, wird weiterhin die neueste Version installiert.

- „Set Web Admin Password“ fragt vor dem Ersetzen eines vorhandenen Passworts nach einer Bestätigung.
- „Delete World“ öffnet sich ohne ausgewählte Welt.
- „Configure Server“, „Mod Loader“, „Manage Whitelist“ und die Welt-Aktionen erklären jede Option in ihren Feldbeschreibungen.`,
    pl_PL: `Moduł ładujący mody może przypiąć wersję NeoForge lub Fabric Loader na serwerach NeoForge i Fabric. Puste pole nadal instaluje najnowszą wersję.

- „Set Web Admin Password” prosi o potwierdzenie przed zastąpieniem istniejącego hasła.
- „Delete World” otwiera się bez zaznaczonego świata.
- „Configure Server”, „Mod Loader”, „Manage Whitelist” i akcje światów objaśniają każdą opcję w opisach pól.`,
    fr_FR: `Le chargeur de mods peut figer la version de NeoForge ou de Fabric Loader sur les serveurs NeoForge et Fabric. Laissée vide, elle continue d'installer la version la plus récente.

- Set Web Admin Password demande une confirmation avant de remplacer un mot de passe existant.
- Delete World s'ouvre sans monde sélectionné.
- Configure Server, Mod Loader, Manage Whitelist et les actions de monde expliquent chaque option dans la description de leurs champs.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
