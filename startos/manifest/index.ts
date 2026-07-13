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
          'itzg/minecraft-server:java25@sha256:638a65accaafff86d395de28abf71cf28b02d193b59c9301c58ccec0f88da48b',
      },
      arch: ['x86_64', 'aarch64'],
    },
    // Modded loaders (NeoForge/Fabric) target Java 21; vanilla 26.2 needs
    // Java 25. main.ts selects the image to match the configured loader.
    'minecraft-server-java21': {
      source: {
        dockerTag:
          'itzg/minecraft-server:java21@sha256:8303efba7426ce16247df0d3eab4f0514ad97f8f6e0a11d1b536f30a4cec2846',
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
