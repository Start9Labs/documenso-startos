<p align="center">
  <img src="icon.png" alt="Documenso Logo" width="21%">
</p>

# Documenso on StartOS

> Everything not listed in this document should behave the same as upstream
> Documenso. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Documenso](https://github.com/documenso/documenso) is an open-source document signing platform. This package runs it with a private PostgreSQL database, a self-signed document-signing certificate, and an admin account the package creates.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs two upstream images, unmodified, on `x86_64` and `aarch64`.

| Subcontainer    | Image                 | Purpose                                                                                              |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `postgres-sub`  | `postgres` (Alpine)   | The database, listening on `127.0.0.1:5432` only.                                                    |
| `documenso-sub` | `documenso/documenso` | The app. Its default entrypoint applies database migrations, then serves on the configured app port. |

Two short-lived subcontainers also run from the Documenso image: `signing-certificate` at init, to create the signing certificate if it is missing, and `hash-admin-password` while **Set Admin Credentials** runs.

## Volume and Data Layout

All Documenso data, uploaded and signed PDFs included, lives in PostgreSQL. Documenso's upload transport is left at its `database` default.

| Volume                      | Mounted at                              | Contents                                                            |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `db`                        | `/var/lib/postgresql` (postgres)        | PostgreSQL data directory (`data/`).                                |
| `startos`                   | not mounted by the app as a whole       | `store.json`, and `signing/cert.p12`.                               |
| `startos` subpath `signing` | `/opt/documenso` (documenso, read-only) | `cert.p12`, the PKCS#12 certificate that seals completed documents. |

## File Models

`store.json` on the `startos` volume is the only file model. It holds StartOS-side state, not Documenso configuration:

- **Generated once at install and never rewritten:** the PostgreSQL password, `NEXTAUTH_SECRET`, both `NEXT_PRIVATE_ENCRYPTION_*` keys, and the signing-certificate passphrase. Changing the encryption keys makes data Documenso encrypted unreadable; changing the passphrase makes `cert.p12` unusable.
- **Written by actions:** `primaryUrl`, `smtp`, `signupsEnabled`, and `pendingAdmin` (an email, name and bcrypt hash waiting to be applied).
- **Written by the service:** `adminEmail`, once a pending admin has been applied.

Documenso is configured entirely through environment variables that `main.ts` derives from `store.json` on every start, so nothing in Documenso's own configuration survives a hand edit. `cert.p12` is created only when absent: replacing it with your own PKCS#12 file works as long as it uses the stored passphrase.

## Dependencies

None.

## Network Access and Interfaces

| Interface | ID   | Type | Port | Protocol | Purpose                                                          |
| --------- | ---- | ---- | ---- | -------- | ---------------------------------------------------------------- |
| Web UI    | `ui` | `ui` | 3000 | HTTP     | The Documenso app, signing pages, and its REST API under `/api`. |

`NEXT_PUBLIC_WEBAPP_URL` is the primary URL (see **Set Primary URL**). Documenso puts it in every link and email it sends, and its CSRF check rejects any form submission, sign-in included, whose `Origin` is not that URL's origin. The interface's **Open UI** control opens the primary URL.

Outbound: SMTP to the configured mail server, and webhooks users configure. Telemetry is disabled (`DOCUMENSO_DISABLE_TELEMETRY`); no license key is set, so Documenso does not contact its license server.

## Installation and First-Run Flow

- Install generates every secret and the self-signed signing certificate (`CN=Documenso on StartOS`, RSA 2048, valid 100 years). Upstream ships no certificate and cannot sign without one.
- Documenso has no admin bootstrap, so the package provides one. **Set Admin Credentials** records the account in `store.json`. On the next start, an `apply-admin` step waits for Documenso to be healthy, creates the account through Documenso's own signup endpoint if the email has none, then sets its password hash, marks its email verified, adds the `ADMIN` role, and revokes its sessions, password-reset links and email-confirmation links in one transaction. The step then clears `pendingAdmin`, which restarts Documenso.
- While an admin is pending, Documenso listens on unexported port 3001 with signup enabled and rate limits off (`DANGEROUS_BYPASS_RATE_LIMITS`) for the bootstrap. The exported UI port 3000 is unavailable until the admin is applied. Registration on the exported UI always follows **Enable/Disable Signups**, disabled by default.
- Install raises the tasks listed under [Tasks](#tasks); the admin task blocks the first start.

## Actions

**Set Admin Credentials** (`set-admin-credentials`)

- **When:** first install, a forgotten admin password, or to make another existing account an admin.
- **Changes:** stores a pending admin. The account changes on the next start, not when the action runs.
- **Cost:** a few seconds to hash the password. If Documenso is running, it restarts twice: once to apply, and again once applied.
- **Repeat safety:** each run replaces the password, revokes existing password-reset and email-confirmation links, and signs that account out everywhere. Running it with a new email leaves the earlier admin in place.
- **Outputs:** the email and a new 32-character password.
- A new email with no account needs Documenso's signup endpoint, which the package opens on the unexported bootstrap port. If signup fails, the step retries every few seconds, logging the reason. The exported UI stays unavailable until it succeeds; **Set Admin Credentials** remains available to replace the pending account.

**Set Primary URL** (`set-primary-url`)

- **When:** first install, and whenever the address recipients should use changes.
- **Changes:** `NEXT_PUBLIC_WEBAPP_URL`. Restarts Documenso.
- **Repeat safety:** safe. Signing links already emailed keep the old address.

**Configure SMTP** (`manage-smtp`)

- **When:** first install, or when the mail server changes.
- **Changes:** the `NEXT_PRIVATE_SMTP_*` variables. A `From` written as `Name <address>` is split into Documenso's separate sender name and address; a bare address uses the name `Documenso`. Restarts Documenso.
- **Repeat safety:** safe.

**Enable Signups / Disable Signups** (`toggle-signups`)

- **When:** to let people create their own accounts, or to stop them.
- **Changes:** `NEXT_PUBLIC_DISABLE_SIGNUP`. Restarts Documenso.
- **Repeat safety:** each run flips the setting.

## Tasks

| Task                    | Severity    | Raised when                                                                    | Cleared by                                                                                                                      |
| ----------------------- | ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `set-admin-credentials` | `critical`  | No admin has been applied and none is pending.                                 | Running **Set Admin Credentials**. Does not return once an admin exists.                                                        |
| `set-primary-url`       | `important` | The stored primary URL is unset or no longer one of the interface's addresses. | Choosing an address with **Set Primary URL**. Returns if that address goes away, for example after a restore assigns new ports. |
| `manage-smtp`           | `important` | Install.                                                                       | Running **Configure SMTP**. Does not return.                                                                                    |

## Health Checks

| Check       | Probes                                                                                                         | Grace   | A failure means                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgres`  | `pg_isready` on `127.0.0.1`                                                                                    | default | PostgreSQL has not started. Read the `postgres` lines in the service log.                                                                                                     |
| `documenso` | `GET /api/health` on the active internal port (3001 during admin bootstrap, otherwise 3000); requires HTTP 2xx | 120 s   | Documenso is still migrating or starting, or cannot reach the database. A missing signing certificate shows as healthy: the endpoint reports it as a warning with status 200. |

Transient health-check failures in the log during the first seconds after a start are the check polling before Documenso listens.

## Backups and Restore

The `db` volume is not copied. The backup is a `pg_dump` of the `documenso` database, and restore rebuilds PostgreSQL from it, because PostgreSQL data files are not portable across CPU architectures. The `startos` volume is copied whole, so `store.json`, every secret and `cert.p12` come back with it.

After a restore the interface may receive new ports. If the stored primary URL is no longer one of its addresses, Documenso falls back to another address and the `set-primary-url` task returns. Signing links in emails sent before the backup point at the old address.

## Limitations and Differences

1. Sign-in and every other form submission work only at the primary URL. Upstream's CSRF check compares `Origin` with `NEXT_PUBLIC_WEBAPP_URL`.
2. Recipients must be able to reach the primary URL. Signing over the internet needs a public domain on the interface.
3. Completed documents are sealed with a self-signed certificate, so PDF readers show its signer as untrusted. Google Cloud HSM and CSC signing transports and timestamp authorities are not configured.
4. DOCX upload is unavailable. Upstream needs a separate Gotenberg service for it, which the package does not run.
5. S3 storage, Google, Microsoft and OIDC sign-in, Stripe billing, and enterprise license keys are not configurable.
6. Background jobs use upstream's `local` provider, backed by PostgreSQL. Inngest and BullMQ are not configured.
7. A wrong password at sign-in returns HTTP 500 rather than 401; the page still shows an error. This is upstream behavior.

---

## Quick Reference for AI Consumers

```yaml
package_id: documenso
image: documenso/documenso
architectures: [x86_64, aarch64]
subcontainers:
  - postgres-sub
  - documenso-sub
volumes:
  db: /var/lib/postgresql
  startos: /opt/documenso (subpath signing, read-only)
file_models:
  - store.json
startos_managed_env_vars:
  - PORT
  - NEXTAUTH_SECRET
  - NEXT_PRIVATE_ENCRYPTION_KEY
  - NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY
  - NEXT_PUBLIC_WEBAPP_URL
  - NEXT_PRIVATE_INTERNAL_WEBAPP_URL
  - NEXT_PRIVATE_DATABASE_URL
  - NEXT_PRIVATE_DIRECT_DATABASE_URL
  - NEXT_PRIVATE_SIGNING_TRANSPORT
  - NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH
  - NEXT_PRIVATE_SIGNING_PASSPHRASE
  - NEXT_PUBLIC_DISABLE_SIGNUP
  - DOCUMENSO_DISABLE_TELEMETRY
  - NEXT_PRIVATE_SMTP_TRANSPORT
  - NEXT_PRIVATE_SMTP_HOST
  - NEXT_PRIVATE_SMTP_PORT
  - NEXT_PRIVATE_SMTP_SECURE
  - NEXT_PRIVATE_SMTP_USERNAME
  - NEXT_PRIVATE_SMTP_PASSWORD
  - NEXT_PRIVATE_SMTP_FROM_NAME
  - NEXT_PRIVATE_SMTP_FROM_ADDRESS
dependencies: none
interfaces:
  ui: { type: ui, port: 3000 }
actions:
  - set-admin-credentials
  - set-primary-url
  - manage-smtp
  - toggle-signups
tasks:
  - { action: set-admin-credentials, severity: critical }
  - { action: set-primary-url, severity: important }
  - { action: manage-smtp, severity: important }
health_checks:
  - postgres
  - documenso
```
