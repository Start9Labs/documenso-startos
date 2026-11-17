import { primaryUrl } from '../primaryUrl'
import { sdk } from '../sdk'
import { manageSmtp } from './manageSmtp'
import { setAdminCredentials } from './setAdminCredentials'
import { toggleSignups } from './toggleSignups'

export const actions = sdk.Actions.of()
  .addAction(setAdminCredentials)
  .addAction(primaryUrl.action)
  .addAction(manageSmtp)
  .addAction(toggleSignups)
