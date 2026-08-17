import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:4',
  releaseNotes: {
    en_US: `Package maintenance update. Minecraft itself is unchanged at 26.2 ("Chaos Cubed").

- Fixes the RCON Web Admin launch link. Its address carried a "admin@" prefix, which Chromium-based browsers strip or refuse — the console signs you in with its own form, so the prefix served no purpose.
- Refreshes the Java 25 and Java 21 Minecraft server base images to their latest builds, picking up upstream security and dependency fixes.`,
    es_ES: `Actualización de mantenimiento del paquete. Minecraft se mantiene sin cambios en 26.2 ("Chaos Cubed").

- Corrige el enlace de acceso al administrador web RCON. Su dirección incluía el prefijo "admin@", que los navegadores basados en Chromium eliminan o rechazan; la consola inicia sesión con su propio formulario, así que el prefijo no servía para nada.
- Actualiza las imágenes base del servidor de Minecraft para Java 25 y Java 21 a sus últimas compilaciones, incorporando correcciones de seguridad y de dependencias.`,
    de_DE: `Wartungsupdate des Pakets. Minecraft selbst bleibt unverändert bei 26.2 ("Chaos Cubed").

- Behebt den Link zur RCON-Weboberfläche. Die Adresse enthielt das Präfix „admin@", das Chromium-basierte Browser entfernen oder ablehnen – die Konsole meldet Sie über ihr eigenes Formular an, das Präfix hatte also keinen Zweck.
- Aktualisiert die Minecraft-Server-Basis-Images für Java 25 und Java 21 auf ihre neuesten Builds und übernimmt damit Sicherheits- und Abhängigkeitskorrekturen.`,
    pl_PL: `Aktualizacja konserwacyjna pakietu. Sam Minecraft pozostaje bez zmian w wersji 26.2 („Chaos Cubed").

- Naprawia odnośnik otwierający panel administracyjny RCON. Adres zawierał przedrostek „admin@", który przeglądarki oparte na Chromium usuwają lub odrzucają — konsola loguje użytkownika własnym formularzem, więc przedrostek niczemu nie służył.
- Odświeża obrazy bazowe serwera Minecraft dla Javy 25 i Javy 21 do najnowszych kompilacji, wraz z poprawkami bezpieczeństwa i zależności.`,
    fr_FR: `Mise à jour de maintenance du paquet. Minecraft lui-même reste inchangé en 26.2 (« Chaos Cubed »).

- Corrige le lien d'ouverture de l'administration web RCON. Son adresse comportait le préfixe « admin@ », que les navigateurs basés sur Chromium suppriment ou refusent ; la console vous connecte via son propre formulaire, le préfixe n'avait donc aucune utilité.
- Actualise les images de base du serveur Minecraft pour Java 25 et Java 21 vers leurs dernières versions, intégrant les correctifs de sécurité et de dépendances.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
