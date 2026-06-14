import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_26_1_2_2 = VersionInfo.of({
  version: '26.1.2:2',
  releaseNotes: {
    en_US:
      'Adds optional mod-loader support: switch to NeoForge or Fabric and install mods from Modrinth via the new Mod Loader action. Vanilla remains the default.',
    es_ES:
      'Anade soporte opcional de cargadores de mods: cambia a NeoForge o Fabric e instala mods desde Modrinth con la nueva accion Mod Loader. Vanilla sigue siendo el valor predeterminado.',
    de_DE:
      'Fuegt optionale Mod-Loader-Unterstuetzung hinzu: zu NeoForge oder Fabric wechseln und Mods von Modrinth ueber die neue Aktion Mod Loader installieren. Vanilla bleibt Standard.',
    pl_PL:
      'Dodaje opcjonalna obsluge loaderow modow: przelacz na NeoForge lub Fabric i instaluj mody z Modrinth za pomoca nowej akcji Mod Loader. Vanilla pozostaje domyslny.',
    fr_FR:
      'Ajoute la prise en charge optionnelle des chargeurs de mods : passez a NeoForge ou Fabric et installez des mods depuis Modrinth via la nouvelle action Mod Loader. Vanilla reste la valeur par defaut.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
