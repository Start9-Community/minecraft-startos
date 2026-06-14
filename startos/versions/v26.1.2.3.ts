import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const v_26_1_2_3 = VersionInfo.of({
  version: '26.1.2:3',
  releaseNotes: {
    en_US:
      'Fixes a restart hang on modded (NeoForge/Fabric) servers: the server is now stopped cleanly over RCON instead of being force-killed after a timeout.',
    es_ES:
      'Corrige un bloqueo al reiniciar en servidores con mods (NeoForge/Fabric): el servidor ahora se detiene limpiamente por RCON en lugar de cerrarse a la fuerza tras un tiempo de espera.',
    de_DE:
      'Behebt ein Haengen beim Neustart modifizierter Server (NeoForge/Fabric): der Server wird jetzt sauber ueber RCON gestoppt, statt nach einer Zeitueberschreitung hart beendet zu werden.',
    pl_PL:
      'Naprawia zawieszanie przy restarcie serwerow z modami (NeoForge/Fabric): serwer jest teraz czysto zatrzymywany przez RCON zamiast wymuszonego zamkniecia po przekroczeniu limitu czasu.',
    fr_FR:
      "Corrige un blocage au redemarrage des serveurs moddes (NeoForge/Fabric) : le serveur est maintenant arrete proprement via RCON au lieu d'etre tue de force apres un delai.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
