import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_26_1_2_1 = VersionInfo.of({
  version: '26.1.2:1',
  releaseNotes: {
    en_US: 'Refreshes the `itzg/minecraft-server:java25` image pin.',
    es_ES: 'Actualiza el pin de la imagen `itzg/minecraft-server:java25`.',
    de_DE:
      'Aktualisiert das Image-Pinning fuer `itzg/minecraft-server:java25`.',
    pl_PL: 'Odswieza przypiecie obrazu `itzg/minecraft-server:java25`.',
    fr_FR: "Actualise l'epinglage de l'image `itzg/minecraft-server:java25`.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
