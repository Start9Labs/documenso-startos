import { manageSmtp } from '../actions/manageSmtp'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const smtpTask = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await sdk.action.createOwnTask(effects, manageSmtp, 'important', {
      reason: i18n('Configure SMTP so Documenso can email signing requests'),
    })
  }
})
