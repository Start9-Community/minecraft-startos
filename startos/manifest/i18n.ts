type Locale = 'en_US' | 'es_ES' | 'de_DE' | 'pl_PL' | 'fr_FR'
type LocalizedText = Record<Locale, string>

export const shortDescription: LocalizedText = {
  en_US: 'Java Edition Minecraft server with web-based management',
  es_ES: 'Servidor de Minecraft Java Edition con gestion web',
  de_DE: 'Minecraft Java Edition Server mit webbasierter Verwaltung',
  pl_PL: 'Serwer Minecraft Java Edition z zarzadzaniem przez WWW',
  fr_FR: 'Serveur Minecraft Java Edition avec gestion web',
}

export const longDescription: LocalizedText = {
  en_US:
    'Minecraft Server is a vanilla Java Edition server with RCON-based web administration, configurable memory, world, gameplay, and idle pause behavior, whitelist management, and persistent world data.',
  es_ES:
    'Minecraft Server es un servidor vanilla de Java Edition con administracion web por RCON, memoria configurable, configuracion de mundo y jugabilidad, pausa en inactividad, gestion de lista blanca y datos persistentes.',
  de_DE:
    'Minecraft Server ist ein Vanilla-Java-Edition-Server mit RCON-basierter Webverwaltung, konfigurierbarem Speicher, Welt- und Gameplay-Einstellungen, Leerlaufpause, Whitelist-Verwaltung und persistenten Weltdaten.',
  pl_PL:
    'Minecraft Server to serwer vanilla Java Edition z panelem WWW opartym o RCON, konfigurowalna pamiecia, ustawieniami swiata i rozgrywki, pauza przy braku graczy, lista biala i trwalymi danymi swiata.',
  fr_FR:
    'Minecraft Server est un serveur vanilla Java Edition avec administration web via RCON, memoire configurable, reglage du monde et du gameplay, pause en inactivite, gestion de liste blanche et donnees persistantes.',
}
