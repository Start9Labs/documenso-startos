import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { documensoUid, signingSubpath } from '../utils'

const volumeMount = '/mnt/startos'
const certPath = `${volumeMount}/${signingSubpath}/cert.p12`

// Creates the self-signed certificate Documenso seals completed documents with.
export const signingCertificate = sdk.setupOnInit(async (effects) => {
  const passphrase = await storeJson.read((s) => s.signingPassphrase).once()
  if (!passphrase) throw new Error('No signing passphrase found in store.json')

  await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'documenso' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'startos',
      subpath: null,
      mountpoint: volumeMount,
      readonly: false,
    }),
    'signing-certificate',
    async (sub) => {
      await sub.execFail(
        [
          'sh',
          '-euc',
          `
          [ -f "${certPath}" ] && exit 0
          mkdir -p "$(dirname "${certPath}")"
          cd "$(mktemp -d)"
          openssl req -x509 -newkey rsa:2048 -nodes -days 36500 \
            -subj "/CN=Documenso on StartOS" -keyout key.pem -out cert.pem
          openssl pkcs12 -export -inkey key.pem -in cert.pem \
            -out "${certPath}.tmp" -password env:SIGNING_PASSPHRASE
          chown ${documensoUid} "${certPath}.tmp"
          chmod 400 "${certPath}.tmp"
          mv "${certPath}.tmp" "${certPath}"
          `,
        ],
        { user: 'root', env: { SIGNING_PASSPHRASE: passphrase } },
      )
    },
  )
})
