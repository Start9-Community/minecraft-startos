import { setupManifest } from '@start9labs/start-sdk'
import { longDescription, shortDescription } from './i18n'

export const manifest = setupManifest({
  id: 'minecraft',
  title: 'Minecraft Server',
  license: 'Apache-2.0',
  packageRepo: 'https://github.com/Start9-Community/minecraft-startos',
  upstreamRepo: 'https://github.com/itzg/docker-minecraft-server',
  marketingUrl: 'https://www.minecraft.net/',
  donationUrl: null,
  description: {
    short: shortDescription,
    long: longDescription,
  },
  volumes: ['main'],
  images: {
    'minecraft-server': {
      source: {
        dockerTag:
          'itzg/minecraft-server:java25@sha256:2fe790e54fc0138ab9f011b38473c11161984b911d32ebfd6877f7411f736937',
      },
      arch: ['x86_64', 'aarch64'],
    },
    // Modded loaders run on one of three bundled Java runtimes, chosen by the
    // user (Java 25 for the latest releases, Java 21 by default, Java 8 for
    // older packs like Forge 1.12.2). Vanilla 26.2 needs Java 25. main.ts
    // selects the image to match the configured loader and Java version.
    'minecraft-server-java21': {
      source: {
        dockerTag:
          'itzg/minecraft-server:java21@sha256:4e233c1ae0231918cdff527c5d9be42eafb52c4eb0a5cf2e631e5d2305bd89f6',
      },
      arch: ['x86_64', 'aarch64'],
    },
    'minecraft-server-java8': {
      source: {
        dockerTag:
          'itzg/minecraft-server:java8@sha256:860b198305e6bfe1bdec8abee2b3a0ef4208edf2e9cbf7e09cb3df97bef2bd6c',
      },
      arch: ['x86_64', 'aarch64'],
    },
    rcon: {
      source: { dockerBuild: { dockerfile: './rcon.Dockerfile' } },
      arch: ['x86_64', 'aarch64'],
    },
    'rcon-proxy': {
      source: { dockerTag: 'nginx:1.30-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
