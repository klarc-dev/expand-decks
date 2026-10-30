# Coolify deployment

Production is a GitHub-backed Docker Compose application in Coolify.

## Source of truth

- Repository: `klarc-dev/expand-decks`
- Branch: `main`
- Compose file: `/docker-compose.yaml`
- Public service: `payload`, port `3000`
- Queue services: `payload-worker-1` and `payload-worker-2`
- Persistent host paths:
  - `/home/joachim/docker/expand-decks/postgres`
  - `/home/joachim/docker/expand-decks/media`

Coolify owns Traefik routing and TLS. The Compose file only declares HSTS
middleware labels and the external `coolify` network.

## Configuration

The GitHub `production` environment stores every secret referenced by
`docker-compose.yaml`. `.github/workflows/sync-coolify-env.yml` is the single
secret-to-environment mapping. The main CI workflow calls it after the live
quality gates and before deployment; `.github/workflows/sync-coolify-secrets.yml`
exposes the same sync as a manual operation. Both callers forward environment
secrets with `secrets: inherit`.

The synchronized variables are available during both Compose interpolation and
container runtime. Coolify assigns a fixed container name per Compose service,
so worker concurrency is represented by two explicit services rather than
`deploy.replicas`.

Pushing application code to `main` runs verification and live evaluation, syncs
the environment, then requests the exact verified revision through Coolify's API.
Database migrations run before the web process starts.

## Transactional email

Payload uses the version-matched first-party `@payloadcms/email-nodemailer` adapter
for native password reset and other transactional mail. Configure all six
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`, and
`SMTP_FROM_NAME` secrets in the GitHub `production` environment before deployment.
Use Brevo `smtp-relay.brevo.com:587`, the Brevo SMTP login and **SMTP key**
(not its API key), and an authorized sender on the authenticated `klarc.com` domain.
All Payload web/worker services receive the same settings. Production refuses
incomplete SMTP configuration; only fully unconfigured development uses console mail.

STARTTLS is required and TLS certificates are validated (TLS 1.2 minimum).
Build-time placeholders do not send or connect to SMTP; adapter startup verification
is skipped because config is compiled by Next and migrations too. Actual sends
still authenticate and require validated TLS. Do not treat build success as mail proof.

After authorized deployment, request a password reset from `/admin/forgot` for
a known internal user (native REST: `POST /api/users/forgot-password`). Verify
the message in the recipient mailbox and Brevo delivery events, and follow the
reset link to the real application. Never log reset tokens or SMTP credentials.

## Verification

1. `GET /api/health` returns `200` with `{ "status": "ok" }`.
2. Coolify reports Postgres, Payload, and both Payload workers healthy.
3. `/admin` loads and an administrator can authenticate.
4. Building a presentation produces both the PDF and SPA under the shared media
   mount, and the public SPA route serves the result.
