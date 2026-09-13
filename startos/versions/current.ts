import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:6',
  releaseNotes: {
    en_US:
      'Mod Loader now has a Java Version choice for NeoForge, Fabric and ' +
      'Modrinth modpacks: Java 25, Java 21 (the default), Java 17, or Java 8. ' +
      'The chosen Java downloads on the first start that needs it, so a modded ' +
      'server needs internet on its next start. The package is about half its ' +
      'previous size.',
    es_ES:
      'El cargador de mods ahora permite elegir la versión de Java para ' +
      'NeoForge, Fabric y modpacks de Modrinth: Java 25, Java 21 (la ' +
      'predeterminada), Java 17 o Java 8. La versión elegida se descarga en el ' +
      'primer inicio que la necesite, así que un servidor con mods necesita ' +
      'internet en su próximo inicio. El paquete ocupa aproximadamente la mitad ' +
      'que antes.',
    de_DE:
      'Der Mod-Loader bietet jetzt eine Java-Versionsauswahl für NeoForge, ' +
      'Fabric und Modrinth-Modpacks: Java 25, Java 21 (Standard), Java 17 oder ' +
      'Java 8. Die gewählte Java-Version wird beim ersten Start, der sie ' +
      'benötigt, heruntergeladen; ein modifizierter Server braucht beim ' +
      'nächsten Start also Internet. Das Paket ist etwa halb so groß wie zuvor.',
    pl_PL:
      'Moduł ładujący mody ma teraz wybór wersji Javy dla NeoForge, Fabric i ' +
      'modpaków z Modrinth: Java 25, Java 21 (domyślnie), Java 17 lub Java 8. ' +
      'Wybrana Java jest pobierana przy pierwszym uruchomieniu, które jej ' +
      'wymaga, więc serwer z modami potrzebuje internetu przy następnym ' +
      'uruchomieniu. Pakiet jest o około połowę mniejszy niż wcześniej.',
    fr_FR:
      'Le chargeur de mods propose désormais un choix de version de Java pour ' +
      'NeoForge, Fabric et les modpacks Modrinth : Java 25, Java 21 (par ' +
      'défaut), Java 17 ou Java 8. La version choisie est téléchargée au ' +
      'premier démarrage qui en a besoin ; un serveur moddé a donc besoin ' +
      "d'internet à son prochain démarrage. Le paquet fait environ la moitié " +
      'de sa taille précédente.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
