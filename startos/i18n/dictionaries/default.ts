export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Documenso!': 0,
  Database: 1,
  'The database is ready': 2,
  'Waiting for the database': 3,
  'Web Interface': 4,
  'The web interface is ready': 5,
  'The web interface is not ready': 6,
  // interfaces.ts
  'Web UI': 7,
  'The Documenso web app, where you prepare documents and recipients sign them': 8,
  // primaryUrl.ts / init/primaryUrlTask.ts
  'Set Primary URL': 9,
  'Choose the URL Documenso puts in signing links, emails and other absolute links. Recipients must be able to reach it.': 10,
  URL: 11,
  'Choose the URL Documenso puts in signing links and emails. Recipients must be able to reach it.': 12,
  // actions/setAdminCredentials.ts / init/watchAdmin.ts
  'Set Admin Credentials': 13,
  'Create a Documenso admin account, or make an existing account an admin, with a new random password. Run it again to reset the password.': 14,
  "Replaces the account's password and signs it out everywhere. Documenso restarts to apply it.": 15,
  Email: 16,
  'The email address you sign in with. An existing Documenso account with this address is made an admin.': 17,
  Name: 18,
  'Your display name in Documenso. Used only when creating a new account.': 19,
  'Admin Credentials': 20,
  'Documenso applies these credentials the next time it starts. Start it, or wait for it to restart, then sign in.': 21,
  Password: 22,
  'Create the Documenso admin account': 23,
  // actions/manageSmtp.ts / init/smtpTask.ts
  'Configure SMTP': 24,
  'Choose how Documenso sends email: signing requests, completed documents and password resets. Use the StartOS system SMTP server, your own, or disable email.': 25,
  'Configure SMTP so Documenso can email signing requests': 26,
  // actions/toggleSignups.ts
  'Enable Signups': 27,
  'Disable Signups': 28,
  'Stop anyone who can reach Documenso from creating an account. Admins can still add users from the admin panel.': 29,
  'Let anyone who can reach Documenso create an account. Admins can add users from the admin panel without this.': 30,
  'Anyone who can reach this Documenso server can create an account and send documents from it.': 31,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
