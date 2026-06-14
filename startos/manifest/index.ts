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
          'itzg/minecraft-server:java25@sha256:8d5cbace1b377a26c089f31a14865fefc9f7b335a85b95f231af2b958186e2ec',
      },
      arch: ['x86_64', 'aarch64'],
    },
    // Modded loaders (NeoForge/Fabric) target Java 21; vanilla 26.1.2 needs
    // Java 25. main.ts selects the image to match the configured loader.
    'minecraft-server-java21': {
      source: {
        dockerTag:
          'itzg/minecraft-server:java21@sha256:79076762d915374272c088a0411769b3747ba3eff6290cf9de9dd4ed8ca961a5',
      },
      arch: ['x86_64', 'aarch64'],
    },
    rcon: {
      source: { dockerBuild: { dockerfile: './rcon.Dockerfile' } },
      arch: ['x86_64', 'aarch64'],
    },
    'rcon-proxy': {
      source: { dockerTag: 'nginx:1.27-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
