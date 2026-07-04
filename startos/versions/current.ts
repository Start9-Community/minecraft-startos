import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '26.2:0',
  releaseNotes: {
    en_US:
      'Updated Minecraft to 26.2 ("Chaos Cubed"). Highlights: a new sulfur caves biome with sulfur and cinnabar blocks, the block-absorbing sulfur cube mob, a friends list on the title screen, and an experimental Vulkan renderer; beds, signs, and hanging signs now use block models, plus over 100 bug fixes. Release notes: https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2\nAlso includes internal updates for start-sdk 2.0.',
    es_ES:
      'Se actualizó Minecraft a 26.2 ("Chaos Cubed"). Novedades: un nuevo bioma de cuevas de azufre con bloques de azufre y cinabrio, el mob cubo de azufre que absorbe bloques, una lista de amigos en la pantalla de título y un renderizador Vulkan experimental; las camas, los carteles y los carteles colgantes ahora usan modelos de bloque, además de más de 100 correcciones de errores. Notas de la versión: https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2\nTambién incluye actualizaciones internas para start-sdk 2.0.',
    de_DE:
      'Minecraft auf 26.2 ("Chaos Cubed") aktualisiert. Höhepunkte: ein neues Schwefelhöhlen-Biom mit Schwefel- und Zinnoberblöcken, der blockabsorbierende Schwefelwürfel-Mob, eine Freundesliste im Titelbildschirm und ein experimenteller Vulkan-Renderer; Betten, Schilder und Hängeschilder nutzen jetzt Blockmodelle, dazu über 100 Fehlerbehebungen. Versionshinweise: https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2\nEnthält außerdem interne Aktualisierungen für start-sdk 2.0.',
    pl_PL:
      'Zaktualizowano Minecraft do 26.2 ("Chaos Cubed"). Najważniejsze: nowy biom jaskiń siarkowych z blokami siarki i cynobru, wchłaniający bloki mob sześcian siarki, lista znajomych na ekranie tytułowym oraz eksperymentalny renderer Vulkan; łóżka, tabliczki i wiszące tabliczki korzystają teraz z modeli blokowych, a także ponad 100 poprawek błędów. Informacje o wydaniu: https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2\nZawiera również wewnętrzne aktualizacje dla start-sdk 2.0.',
    fr_FR:
      'Mise à jour de Minecraft vers 26.2 ("Chaos Cubed"). Points forts : un nouveau biome de grottes de soufre avec des blocs de soufre et de cinabre, le mob cube de soufre qui absorbe les blocs, une liste d\'amis sur l\'écran-titre et un moteur de rendu Vulkan expérimental ; les lits, les pancartes et les pancartes suspendues utilisent désormais des modèles de bloc, ainsi que plus de 100 corrections de bugs. Notes de version : https://www.minecraft.net/en-us/article/minecraft-java-edition-26-2\nComprend également des mises à jour internes pour start-sdk 2.0.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
