import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const secret = () => utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 64 })

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await storeJson.merge(effects, {
      postgresPassword: utils.getDefaultString({
        charset: 'a-z,A-Z,0-9',
        len: 32,
      }),
      nextauthSecret: secret(),
      encryptionKey: secret(),
      encryptionSecondaryKey: secret(),
      signingPassphrase: secret(),
    })
  } else {
    await storeJson.merge(effects, {})
  }
})
