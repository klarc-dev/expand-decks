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
`docker-compose.yaml`. `.github/workflows/sync-coolify-secrets.yml` synchronizes
those values to Coolify when the Compose contract changes or when manually
dispatched.

The synchronized variables are available during both Compose interpolation and
container runtime. Coolify assigns a fixed container name per Compose service,
so worker concurrency is represented by two explicit services rather than
`deploy.replicas`.

Pushing application code to `main` triggers Coolify through its GitHub App and
the configured watch path. Database migrations run before the web process starts.

## Verification

1. `GET /api/health` returns `200` with `{ "status": "ok" }`.
2. Coolify reports Postgres, Payload, and both Payload workers healthy.
3. `/admin` loads and an administrator can authenticate.
4. Building a presentation produces both the PDF and SPA under the shared media
   mount, and the public SPA route serves the result.
