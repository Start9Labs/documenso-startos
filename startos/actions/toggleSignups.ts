import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const toggleSignups = sdk.Action.withoutInput(
  'toggle-signups',

  async ({ effects }) => {
    const enabled = await storeJson.read((s) => s.signupsEnabled).const(effects)
    return {
      name: enabled ? i18n('Disable Signups') : i18n('Enable Signups'),
      description: enabled
        ? i18n(
            'Stop anyone who can reach Documenso from creating an account. Admins can still add users from the admin panel.',
          )
        : i18n(
            'Let anyone who can reach Documenso create an account. Admins can add users from the admin panel without this.',
          ),
      warning: enabled
        ? null
        : i18n(
            'Anyone who can reach this Documenso server can create an account and send documents from it.',
          ),
      allowedStatuses: 'any',
      group: null,
      visibility: 'enabled',
    }
  },

  async ({ effects }) => {
    const enabled = await storeJson.read((s) => s.signupsEnabled).once()
    await storeJson.merge(effects, { signupsEnabled: !enabled })
  },
)
