import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:7',
  releaseNotes: {
    en_US:
      'Mod Loader can pin the NeoForge or Fabric Loader build for NeoForge and ' +
      'Fabric servers. Leaving it empty keeps installing the newest build.',
    es_ES:
      'El cargador de mods puede fijar la versión de NeoForge o de Fabric ' +
      'Loader en los servidores NeoForge y Fabric. Si se deja vacía, se sigue ' +
      'instalando la versión más reciente.',
    de_DE:
      'Der Mod-Loader kann für NeoForge- und Fabric-Server die NeoForge- bzw. ' +
      'Fabric-Loader-Version festlegen. Bleibt das Feld leer, wird weiterhin ' +
      'die neueste Version installiert.',
    pl_PL:
      'Moduł ładujący mody może przypiąć wersję NeoForge lub Fabric Loader na ' +
      'serwerach NeoForge i Fabric. Puste pole nadal instaluje najnowszą ' +
      'wersję.',
    fr_FR:
      'Le chargeur de mods peut figer la version de NeoForge ou de Fabric ' +
      'Loader sur les serveurs NeoForge et Fabric. Laissée vide, elle continue ' +
      "d'installer la version la plus récente.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
