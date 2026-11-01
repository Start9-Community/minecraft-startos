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
        dockerBuild: {
          buildArgs: {
            IMAGE:
              'itzg/minecraft-server:java25@sha256:f7f2222512810f0f0e85133913622cf639be77a5dd1d4b11f24ab675da6ba742',
          },
        },
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
})
