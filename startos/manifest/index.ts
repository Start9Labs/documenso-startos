import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

const documensoImage = 'documenso/documenso'
const documensoVersion = 'v2.22.0'

export const manifest = setupManifest({
  id: 'documenso',
  title: 'Documenso',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/Start9Labs/documenso-startos',
  upstreamRepo: 'https://github.com/documenso/documenso',
  marketingUrl: 'https://documenso.com/',
  donationUrl: null,
  description: { short, long },
  volumes: ['startos', 'db'],
  images: {
    documenso: {
      source: { dockerTag: `${documensoImage}:${documensoVersion}` },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:15-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
