import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:1',
  releaseNotes: {
    en_US: `Package maintenance update. Minecraft itself is unchanged at 26.2 ("Chaos Cubed").

- Refreshes the Java 25 and Java 21 Minecraft server base images to their latest builds, picking up upstream security and dependency fixes.
- Updates the bundled nginx proxy that fronts the RCON web admin from 1.27 to 1.30.`,
    es_ES: `Actualización de mantenimiento del paquete. Minecraft se mantiene sin cambios en 26.2 ("Chaos Cubed").

- Actualiza las imágenes base del servidor de Minecraft para Java 25 y Java 21 a sus últimas compilaciones, incorporando correcciones de seguridad y de dependencias.
- Actualiza el proxy nginx incluido que da acceso al administrador web RCON, de 1.27 a 1.30.`,
    de_DE: `Wartungsupdate des Pakets. Minecraft selbst bleibt unverändert bei 26.2 ("Chaos Cubed").

- Aktualisiert die Minecraft-Server-Basis-Images für Java 25 und Java 21 auf ihre neuesten Builds und übernimmt damit Sicherheits- und Abhängigkeitskorrekturen.
- Aktualisiert den mitgelieferten nginx-Proxy vor der RCON-Weboberfläche von 1.27 auf 1.30.`,
    pl_PL: `Aktualizacja konserwacyjna pakietu. Sam Minecraft pozostaje bez zmian w wersji 26.2 („Chaos Cubed").

- Odświeża obrazy bazowe serwera Minecraft dla Javy 25 i Javy 21 do najnowszych kompilacji, wraz z poprawkami bezpieczeństwa i zależności.
- Aktualizuje dołączony serwer proxy nginx obsługujący panel administracyjny RCON z wersji 1.27 do 1.30.`,
    fr_FR: `Mise à jour de maintenance du paquet. Minecraft lui-même reste inchangé en 26.2 (« Chaos Cubed »).

- Actualise les images de base du serveur Minecraft pour Java 25 et Java 21 vers leurs dernières versions, intégrant les correctifs de sécurité et de dépendances.
- Met à jour le proxy nginx inclus devant l'administration web RCON, de 1.27 vers 1.30.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
