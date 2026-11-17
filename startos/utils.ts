export const uiPort = 3000
export const uiHostId = 'ui-multi'
export const uiInterfaceId = 'ui'

export const postgresPort = 5432
export const postgresUser = 'documenso'
export const postgresDb = 'documenso'
export const postgresMount = '/var/lib/postgresql'

export const databaseUrl = (password: string) =>
  `postgresql://${postgresUser}:${password}@127.0.0.1:${postgresPort}/${postgresDb}`

// Subpath of the `startos` volume holding the document-signing `.p12`.
export const signingSubpath = 'signing'
export const signingMount = '/opt/documenso'
export const signingCertPath = `${signingMount}/cert.p12`

// Matches the `nodejs` user of the upstream image.
export const documensoUid = 1001

// Working directory of the upstream image; its `node_modules` resolve from here.
export const documensoWorkdir = '/app/apps/remix'
