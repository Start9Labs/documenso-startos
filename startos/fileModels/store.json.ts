import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  // Generated once at install. Regenerating the encryption keys makes stored
  // secrets unreadable; regenerating the signing passphrase orphans the `.p12`.
  postgresPassword: z.string().optional().catch(undefined),
  nextauthSecret: z.string().optional().catch(undefined),
  encryptionKey: z.string().optional().catch(undefined),
  encryptionSecondaryKey: z.string().optional().catch(undefined),
  signingPassphrase: z.string().optional().catch(undefined),
  primaryUrl: z.string().catch(''),
  smtp: smtpShape,
  // The applied admin account, and one awaiting the next start.
  adminEmail: z.string().nullable().catch(null),
  pendingAdmin: z
    .looseObject({
      email: z.string(),
      name: z.string(),
      passwordHash: z.string(),
    })
    .nullable()
    .catch(null),
  signupsEnabled: z.boolean().catch(false),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
