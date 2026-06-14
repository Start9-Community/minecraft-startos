import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_26_1_2_4 = VersionInfo.of({
  version: '26.1.2:4',
  releaseNotes: {
    en_US:
      'Fixes the whitelist (listed players were being rejected) and consolidates it into one Manage Whitelist action. Configure Server now restarts to apply changes immediately, and mods can be pinned to a version or channel (e.g. jei:beta) so pre-release-only mods no longer crash the server.',
    es_ES:
      'Corrige la lista blanca (los jugadores de la lista eran rechazados) y la unifica en una sola accion Gestionar Lista Blanca. Configurar Servidor ahora reinicia para aplicar los cambios de inmediato, y los mods pueden fijarse a una version o canal (p. ej. jei:beta) para que los mods que solo tienen versiones preliminares ya no bloqueen el servidor.',
    de_DE:
      'Behebt die Whitelist (eingetragene Spieler wurden abgewiesen) und fasst sie in einer Aktion Whitelist verwalten zusammen. Server konfigurieren startet jetzt neu, um Aenderungen sofort anzuwenden, und Mods koennen auf eine Version oder einen Kanal festgelegt werden (z. B. jei:beta), sodass Mods mit nur Vorabversionen den Server nicht mehr zum Absturz bringen.',
    pl_PL:
      'Naprawia biala liste (wpisani gracze byli odrzucani) i laczy ja w jedna akcje Zarzadzaj bialalista. Konfiguracja serwera teraz restartuje, aby zmiany byly stosowane natychmiast, a mody mozna przypiac do wersji lub kanalu (np. jei:beta), aby mody majace tylko wersje przedpremierowe nie zawieszaly serwera.',
    fr_FR:
      "Corrige la liste blanche (les joueurs inscrits etaient rejetes) et la regroupe dans une seule action Gerer la liste blanche. Configurer le serveur redemarre desormais pour appliquer les changements immediatement, et les mods peuvent etre fixes a une version ou un canal (p. ex. jei:beta) afin que les mods n'ayant que des versions preliminaires ne fassent plus planter le serveur.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
