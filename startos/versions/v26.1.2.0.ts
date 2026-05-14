import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_26_1_2_0 = VersionInfo.of({
  version: '26.1.2:0',
  releaseNotes: {
    en_US: `**Initial Release**

- Vanilla Minecraft Java Edition 26.1.2 via \`itzg/minecraft-server\`.
- RCON Web Admin sidecar exposed as a StartOS UI interface.
- Actions for memory profile, gameplay settings, whitelist, and world management.`,
    es_ES: `**Lanzamiento Inicial**

- Minecraft Java Edition vanilla 26.1.2 mediante \`itzg/minecraft-server\`.
- Sidecar RCON Web Admin expuesto como interfaz de UI de StartOS.
- Acciones para perfil de memoria, ajustes de juego, lista blanca y gestion de mundos.`,
    de_DE: `**Erstveroeffentlichung**

- Vanilla Minecraft Java Edition 26.1.2 ueber \`itzg/minecraft-server\`.
- RCON-Web-Admin-Sidecar als StartOS-UI-Schnittstelle bereitgestellt.
- Aktionen fuer Speicherprofil, Spieleinstellungen, Whitelist und Weltverwaltung.`,
    pl_PL: `**Pierwsze Wydanie**

- Vanilla Minecraft Java Edition 26.1.2 przez \`itzg/minecraft-server\`.
- Sidecar RCON Web Admin udostepniony jako interfejs UI w StartOS.
- Akcje dla profilu pamieci, ustawien rozgrywki, listy bialej i zarzadzania swiatami.`,
    fr_FR: `**Version Initiale**

- Minecraft Java Edition vanilla 26.1.2 via \`itzg/minecraft-server\`.
- Sidecar RCON Web Admin expose comme interface UI StartOS.
- Actions pour profil memoire, parametres de jeu, liste blanche et gestion des mondes.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
