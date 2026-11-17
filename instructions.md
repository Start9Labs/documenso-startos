# Documenso

## Documentation

- [Documenso user guide](https://docs.documenso.com/docs/users/*) — preparing and sending documents, templates, teams and signing.

## What you get on StartOS

- **Web UI** — the Documenso app, where you and your team prepare documents and where recipients open their signing links.
- Documents, signatures, accounts and audit logs are stored in a database on your server. Completed documents are sealed with a certificate your server generated for itself.

## Getting set up

1. Run **Set Admin Credentials**. Enter the email address you want to sign in with, and copy the password it shows you.
2. Run **Configure SMTP**. Documenso emails signing requests, completed documents and password resets. Choose the StartOS system SMTP server or enter your own.
3. Run **Set Primary URL** and choose the address your recipients will open. Signing links and emails use this address, so recipients outside your network need one they can reach, such as a public domain.
4. Start Documenso, open the Web UI **at the primary URL**, and sign in with the email and password from step 1.

## Using Documenso

### Signing in

Sign in at the primary URL. Documenso refuses to sign you in from any of its other addresses: the sign-in page loads, but submitting it does nothing. If you change the primary URL, sign in at the new one.

### Sending documents without email

If SMTP is not set up, choose **None** instead of **Email** when you send a document. Documenso then gives you each recipient's signing link to share yourself.

### Adding people

- To create an account for someone, open **Admin Panel → Users** and choose **Create User**. They receive an email with a link to set their password, so SMTP must be set up.
- **Enable Signups** lets anyone who can reach your Documenso create their own account. Run **Disable Signups** to close it again.

### Actions

- **Set Admin Credentials** — run it again to reset your password. It generates a new one, signs your account out everywhere, and restarts Documenso. Enter a different email to make another existing account an admin.
- **Set Primary URL** — the address Documenso puts in signing links and emails, and the only one you can sign in from.
- **Configure SMTP** — how Documenso sends email.
- **Enable Signups** / **Disable Signups** — whether anyone who can reach Documenso can create an account. Signups start disabled.

### Webhooks

Webhooks you add in Documenso are sent from your server. If you publish Documenso through a tunnel to keep your home IP private, send its outbound traffic through that tunnel too, or the webhook receivers will see your home IP. If you use the tunnel for another reason, you have nothing to change.
