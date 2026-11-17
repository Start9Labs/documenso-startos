import { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  adminBootstrapPort,
  databaseUrl,
  documensoWorkdir,
  postgresDb,
  postgresMount,
  postgresUser,
  signingCertPath,
  signingMount,
  signingSubpath,
  uiPort,
} from './utils'

// Creates the pending admin through Documenso's own signup when the address has
// no account, then sets its password hash, verifies it and grants `ADMIN`.
// Signup rejects any `Origin` but that of `NEXT_PUBLIC_WEBAPP_URL`.
const applyAdminScript = `
const { PrismaClient } = require('@prisma/client')
const { randomBytes } = require('node:crypto')
const prisma = new PrismaClient()
const { ADMIN_EMAIL: email, ADMIN_NAME: name, ADMIN_PASSWORD_HASH: passwordHash, INTERNAL_URL, WEBAPP_ORIGIN } = process.env
;(async () => {
  let user = await prisma.user.findFirst({ where: { email } })
  if (!user) {
    const res = await fetch(INTERNAL_URL + '/api/auth/email-password/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: WEBAPP_ORIGIN },
      body: JSON.stringify({ name, email, password: randomBytes(24).toString('base64url') }),
    })
    if (!res.ok) throw new Error('Signup failed (' + res.status + '): ' + (await res.text()))
    user = await prisma.user.findFirstOrThrow({ where: { email } })
  }
  // Admin rotation revokes prior recovery links, confirmation links and sessions.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        emailVerified: user.emailVerified ?? new Date(),
        disabled: false,
        roles: user.roles.includes('ADMIN') ? user.roles : [...user.roles, 'ADMIN'],
      },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.verificationToken.deleteMany({
      where: { userId: user.id, identifier: 'confirmation-email' },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ])
})()
  .finally(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1) })
`

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Documenso!'))

  const store = await storeJson.read().const(effects)
  if (!store?.postgresPassword) throw new Error('store.json not found')
  const { pendingAdmin } = store

  // Admin bootstrap must not open registration on the exported UI binding.
  const appPort = pendingAdmin ? adminBootstrapPort : uiPort
  const internalUrl = `http://localhost:${appPort}`
  const webappUrl =
    (await primaryUrl.bestUsable(effects).const()) ?? internalUrl

  let smtp: T.SmtpValue | null = null
  if (store.smtp.selection === 'system') {
    smtp = await sdk.getSystemSmtp(effects).const()
    const customFrom = store.smtp.value.customFrom as string | undefined
    if (smtp && customFrom) smtp.from = customFrom
  } else if (store.smtp.selection === 'custom') {
    const p = store.smtp.value.provider.value
    smtp = {
      host: p.host,
      port: Number(p.security.value.port),
      from: p.from,
      username: p.username,
      password: p.password,
      security: p.security.selection,
    }
  }

  const dbUrl = databaseUrl(store.postgresPassword)

  const postgresSub = sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'db',
      subpath: null,
      mountpoint: postgresMount,
      readonly: false,
    }),
    'postgres-sub',
  )

  const documensoSub = sdk.SubContainer.of(
    effects,
    { imageId: 'documenso' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'startos',
      subpath: signingSubpath,
      mountpoint: signingMount,
      readonly: true,
    }),
    'documenso-sub',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('postgres', {
      subcontainer: postgresSub,
      exec: {
        command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
        env: {
          POSTGRES_USER: postgresUser,
          POSTGRES_PASSWORD: store.postgresPassword,
          POSTGRES_DB: postgresDb,
        },
      },
      ready: {
        display: i18n('Database'),
        fn: async () => {
          const { exitCode } = await postgresSub.exec([
            'pg_isready',
            '-U',
            postgresUser,
            '-d',
            postgresDb,
            '-h',
            '127.0.0.1',
          ])
          return exitCode === 0
            ? { result: 'success', message: i18n('The database is ready') }
            : { result: 'starting', message: i18n('Waiting for the database') }
        },
      },
      requires: [],
    })
    .addDaemon('documenso', {
      subcontainer: documensoSub,
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          PORT: String(appPort),
          NEXTAUTH_SECRET: store.nextauthSecret ?? '',
          NEXT_PRIVATE_ENCRYPTION_KEY: store.encryptionKey ?? '',
          NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY:
            store.encryptionSecondaryKey ?? '',
          NEXT_PUBLIC_WEBAPP_URL: webappUrl,
          NEXT_PRIVATE_INTERNAL_WEBAPP_URL: internalUrl,
          NEXT_PRIVATE_DATABASE_URL: dbUrl,
          NEXT_PRIVATE_DIRECT_DATABASE_URL: dbUrl,
          NEXT_PRIVATE_SIGNING_TRANSPORT: 'local',
          NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH: signingCertPath,
          NEXT_PRIVATE_SIGNING_PASSPHRASE: store.signingPassphrase ?? '',
          NEXT_PUBLIC_DISABLE_SIGNUP:
            store.signupsEnabled || pendingAdmin ? 'false' : 'true',
          DOCUMENSO_DISABLE_TELEMETRY: 'true',
          // Failed bootstrap retries otherwise exhaust the signup rate limit.
          ...(pendingAdmin ? { DANGEROUS_BYPASS_RATE_LIMITS: 'true' } : {}),
          ...(smtp ? toSmtpEnv(smtp) : {}),
        },
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.runHealthScript(
            [
              'node',
              '-e',
              `fetch(${JSON.stringify(`${internalUrl}/api/health`)}, { signal: AbortSignal.timeout(1000) })
                .then((res) => process.exit(res.ok ? 0 : 1))
                .catch(() => process.exit(1))`,
            ],
            documensoSub,
            {
              message: () => i18n('The web interface is ready'),
              errorMessage: i18n('The web interface is not ready'),
            },
          ),
        gracePeriod: 120_000,
      },
      requires: ['postgres'],
    })
    .addOneshot(
      'apply-admin',
      () =>
        pendingAdmin && {
          subcontainer: null,
          exec: {
            fn: async () => {
              await documensoSub.execFail(['node', '-e', applyAdminScript], {
                cwd: documensoWorkdir,
                env: {
                  NEXT_PRIVATE_DATABASE_URL: dbUrl,
                  ADMIN_EMAIL: pendingAdmin.email,
                  ADMIN_NAME: pendingAdmin.name,
                  ADMIN_PASSWORD_HASH: pendingAdmin.passwordHash,
                  INTERNAL_URL: internalUrl,
                  WEBAPP_ORIGIN: new URL(webappUrl).origin,
                },
              })
              await storeJson.merge(effects, {
                adminEmail: pendingAdmin.email,
                pendingAdmin: null,
              })
              return null
            },
          },
          requires: ['documenso'],
        },
    )
})

// Documenso takes the sender's name and address separately; StartOS SMTP
// settings carry them together as `Name <address>` or a bare address.
function toSmtpEnv(creds: T.SmtpValue): Record<string, string> {
  const from = creds.from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return {
    NEXT_PRIVATE_SMTP_TRANSPORT: 'smtp-auth',
    NEXT_PRIVATE_SMTP_HOST: creds.host,
    NEXT_PRIVATE_SMTP_PORT: String(creds.port),
    NEXT_PRIVATE_SMTP_FROM_NAME: from?.[1] || 'Documenso',
    NEXT_PRIVATE_SMTP_FROM_ADDRESS: from ? from[2] : creds.from.trim(),
    NEXT_PRIVATE_SMTP_SECURE: creds.security === 'tls' ? 'true' : 'false',
    ...(creds.username ? { NEXT_PRIVATE_SMTP_USERNAME: creds.username } : {}),
    ...(creds.password ? { NEXT_PRIVATE_SMTP_PASSWORD: creds.password } : {}),
  }
}
