import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:5',
  releaseNotes: {
    en_US:
      'Mod Loader can now install a Modrinth modpack. Give it a modpack slug, ' +
      'a project or version URL, or upload a .mrpack, and the server installs ' +
      "the pack's mods, configs and overrides along with the exact loader " +
      'build the pack was built against. Client-only files are skipped ' +
      'automatically. The existing vanilla, NeoForge and Fabric options are ' +
      'unchanged.',
    es_ES:
      'El cargador de mods ya puede instalar un modpack de Modrinth. Indica el ' +
      'identificador del modpack, la URL de un proyecto o de una versión, o sube ' +
      'un archivo .mrpack, y el servidor instalará los mods, las configuraciones ' +
      'y los overrides del pack junto con la versión exacta del cargador para la ' +
      'que fue creado. Los archivos exclusivos del cliente se omiten ' +
      'automáticamente. Las opciones existentes de vanilla, NeoForge y Fabric no ' +
      'cambian.',
    de_DE:
      'Der Mod-Loader kann jetzt ein Modrinth-Modpack installieren. Geben Sie ' +
      'einen Modpack-Slug oder eine Projekt- bzw. Versions-URL an oder laden Sie ' +
      'eine .mrpack-Datei hoch, und der Server installiert die Mods, ' +
      'Konfigurationen und Overrides des Packs zusammen mit genau dem ' +
      'Loader-Build, für den das Pack erstellt wurde. Nur für den Client ' +
      'bestimmte Dateien werden automatisch übersprungen. Die bestehenden ' +
      'Optionen für Vanilla, NeoForge und Fabric bleiben unverändert.',
    pl_PL:
      'Moduł ładujący mody może teraz zainstalować modpack z Modrinth. Podaj ' +
      'identyfikator modpacka, adres URL projektu lub wersji albo prześlij plik ' +
      '.mrpack, a serwer zainstaluje mody, konfiguracje i pliki nadpisujące z ' +
      'paczki wraz z dokładną wersją loadera, dla której paczka została ' +
      'zbudowana. Pliki przeznaczone wyłącznie dla klienta są pomijane ' +
      'automatycznie. Istniejące opcje vanilla, NeoForge i Fabric pozostają bez ' +
      'zmian.',
    fr_FR:
      'Le chargeur de mods peut désormais installer un modpack Modrinth. ' +
      "Indiquez l'identifiant du modpack, l'URL d'un projet ou d'une version, ou " +
      'téléversez un fichier .mrpack, et le serveur installera les mods, les ' +
      'configurations et les overrides du pack ainsi que la version exacte du ' +
      'chargeur pour laquelle il a été conçu. Les fichiers réservés au client ' +
      'sont ignorés automatiquement. Les options vanilla, NeoForge et Fabric ' +
      'existantes restent inchangées.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
