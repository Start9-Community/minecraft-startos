import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:6',
  releaseNotes: {
    en_US:
      'Mod Loader now lets you choose the Java runtime the modded server runs ' +
      'on: Java 25, Java 21 (the default), or Java 8. Older modpacks built ' +
      'for Java 8, such as Forge 1.12.2 packs, run on Java 8; NeoForge ' +
      'and current Fabric run on Java 21. The choice applies to Modrinth ' +
      'modpacks and to hand-picked NeoForge/Fabric mods.',
    es_ES:
      'El cargador de mods ahora permite elegir el runtime de Java con el que ' +
      'se ejecuta el servidor con mods: Java 25, Java 21 (el predeterminado) o ' +
      'Java 8. Los modpacks antiguos creados para Java 8, como los packs ' +
      'de Forge 1.12.2, deben ejecutarse con Java 8; NeoForge y Fabric actuales ' +
      'se ejecutan con Java 21. La elección se aplica a los modpacks de Modrinth ' +
      'y a los mods elegidos a mano de NeoForge/Fabric.',
    de_DE:
      'Der Mod-Loader lässt dich jetzt die Java-Laufzeit wählen, auf der der ' +
      'modifizierte Server läuft: Java 25, Java 21 (die Standardeinstellung) ' +
      'oder Java 8. Ältere Modpacks, die für Java 8 gebaut wurden, wie ' +
      'z. B. Forge-1.12.2-Packs, laufen unter Java 8; NeoForge und aktuelles ' +
      'Fabric laufen unter Java 21. Die Wahl gilt für Modrinth-Modpacks und für ' +
      'manuell ausgewählte NeoForge-/Fabric-Mods.',
    pl_PL:
      'Moduł ładujący mody umożliwia teraz wybór środowiska Java, na którym ' +
      'działa serwer z modami: Java 25, Java 21 (domyślnie) lub Java 8. Starsze ' +
      'modpaki stworzone dla Javy 8, np. modpaki do Forge 1.12.2, działają ' +
      'na Javie 8; NeoForge i aktualny Fabric działają na Javie 21. Wybór ' +
      'obejmuje modpaki z Modrinth oraz ręcznie wybrane mody NeoForge/Fabric.',
    fr_FR:
      'Le chargeur de mods permet désormais de choisir le runtime Java sur ' +
      'lequel le serveur moddé tourne : Java 25, Java 21 (par défaut) ou Java 8. ' +
      'Les vieux modpacks conçus pour Java 8, comme les packs Forge 1.12.2, ' +
      'tournent sous Java 8 ; NeoForge et Fabric actuels tournent sous Java 21. ' +
      "Le choix s'applique aux modpacks Modrinth et aux mods NeoForge/Fabric " +
      'choisis manuellement.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
