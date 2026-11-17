import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { documensoWorkdir } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  email: Value.text({
    name: i18n('Email'),
    description: i18n(
      'The email address you sign in with. An existing Documenso account with this address is made an admin.',
    ),
    required: true,
    default: null,
    patterns: [utils.Patterns.email],
  }),
  name: Value.text({
    name: i18n('Name'),
    description: i18n(
      'Your display name in Documenso. Used only when creating a new account.',
    ),
    required: true,
    default: 'Admin',
  }),
})

// Hashes with Documenso's own bcrypt library and cost factor.
const hashScript = `
const { hashSync } = require('@node-rs/bcrypt')
process.stdout.write(hashSync(process.env.ADMIN_PASSWORD, 12))
`

export const setAdminCredentials = sdk.Action.withInput(
  'set-admin-credentials',

  async ({ effects }) => ({
    name: i18n('Set Admin Credentials'),
    description: i18n(
      'Create a Documenso admin account, or make an existing account an admin, with a new random password. Run it again to reset the password.',
    ),
    warning: (await storeJson.read((s) => s.adminEmail).const(effects))
      ? i18n(
          "Replaces the account's password and signs it out everywhere. Documenso restarts to apply it.",
        )
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const email = await storeJson.read((s) => s.adminEmail).const(effects)
    return email ? { email } : {}
  },

  async ({ effects, input }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })

    const passwordHash = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'documenso' },
      null,
      'hash-admin-password',
      async (sub) =>
        (
          await sub.execFail(['node', '-e', hashScript], {
            cwd: documensoWorkdir,
            env: { ADMIN_PASSWORD: password },
          })
        ).stdout.toString(),
    )

    await storeJson.merge(effects, {
      pendingAdmin: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
      },
    })

    return {
      version: '1',
      title: i18n('Admin Credentials'),
      message: i18n(
        'Documenso applies these credentials the next time it starts. Start it, or wait for it to restart, then sign in.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Email'),
            description: null,
            value: input.email.toLowerCase(),
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
