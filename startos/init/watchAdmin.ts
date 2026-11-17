import { setAdminCredentials } from '../actions/setAdminCredentials'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchAdmin = sdk.setupOnInit(async (effects) => {
  const store = await storeJson.read().const(effects)
  if (!store?.adminEmail && !store?.pendingAdmin) {
    await sdk.action.createOwnTask(effects, setAdminCredentials, 'critical', {
      reason: i18n('Create the Documenso admin account'),
    })
  }
})
