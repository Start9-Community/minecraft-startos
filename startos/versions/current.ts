import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.3:1',
  releaseNotes: {
    en_US: `- Bumps vanilla Minecraft to 26.3.
- Updates the pinned digest for the itzg/minecraft-server java25 image.`,
    es_ES: `- Actualiza Minecraft vanilla a 26.3.
- Actualiza el digest fijado de la imagen itzg/minecraft-server java25.`,
    de_DE: `- Aktualisiert Vanilla-Minecraft auf 26.3.
- Aktualisiert den gepinnten Digest für das itzg/minecraft-server-Image java25.`,
    pl_PL: `- Aktualizuje waniliowego Minecrafta do wersji 26.3.
- Aktualizuje przypięty digest obrazu itzg/minecraft-server java25.`,
    fr_FR: `- Met à jour Minecraft vanilla vers la version 26.3.
- Met à jour le digest épinglé de l'image itzg/minecraft-server java25.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
