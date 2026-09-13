# ENORIN ZERO

Internal portal for monitoring and managing energy assets (battery storage, heat pumps) across
customer and supplier tenants. Built with Next.js and PostgreSQL, deployed as a standalone Docker
container.

## Tech stack

| Layer      | Technology                                      |
| ---------- | ------------------------------------------------ |
| Framework  | Next.js 16 (App Router), React 19, TypeScript     |
| Styling    | Tailwind CSS 4                                    |
| Database   | PostgreSQL, via Prisma 7 + `@prisma/adapter-pg`   |
| Auth       | Custom HMAC-signed session cookie (no NextAuth)   |
| Charts/Map | Recharts, Leaflet / React-Leaflet                 |
| Runtime    | Node.js 22, Docker (standalone Next.js output)    |

## Project structure

```
app/
  page.tsx                 # Home: session-gated dashboard shell (Sidebar + AssetsView)
  login/page.tsx            # Login page
  api/auth/route.ts         # POST: validate credentials, issue session cookie
  api/auth/logout/route.ts
  api/spot-price/route.ts   # Current EPEX/aWATTar spot price, with fallback
  api/inexogy/route.ts      # Per-meter live power reading via the inexogy API
  api/sigencloud/route.ts   # Grid/PV/battery/load power via the Sigen Cloud OpenAPI
  api/weyland/route.ts      # Grid/PV/battery/load power via the Weyland Open Platform API
  api/heat/route.ts         # Grid/PV/battery/load power via the HEAT Cloud API
components/                 # UI components (Sidebar, AssetsView, AssetCard, AssetMap, dialogs, ...)
lib/
  auth.ts                   # Session token creation/verification, credential check
  prisma.ts                 # Singleton Prisma client (pg adapter)
  price-rules.ts            # Spot price fallback/formatting rules
  inexogy-auth.ts            # OAuth1-signed client for the inexogy API
  sigencloud-auth.ts         # Login + client for the Sigen Cloud OpenAPI
  weyland-auth.ts             # Login + client for the Weyland Open Platform API
  heat-auth.ts                # Bearer-token client for the HEAT Cloud API
  mock-data.ts               # Mock assets used for the dashboard
  types.ts
prisma/
  schema.prisma               # Data model (see below)
  migrations/                 # Prisma migration history
scripts/
  create-admin.ts              # One-off CLI script to create/reset the admin user
Dockerfile                     # Multi-stage build → standalone runtime image
DEPLOY.md                      # Coolify deployment notes
```

## Connected APIs

The dashboard pulls live telemetry from the following external providers. Each route degrades
gracefully to a `fallback` response instead of failing if the upstream API is unreachable or
unauthenticated:

| Route | Provider | Data |
|---|---|---|
| `GET /api/inexogy` | [inexogy](https://inexogy.com) (OAuth1-signed) | Per-meter live power reading (W) for registered smart meters |
| `GET /api/sigencloud` | Sigen Cloud OpenAPI | Grid / PV / battery / load power and battery state of charge for the account's system |
| `GET /api/weyland` | Weyland Open Platform API | Grid / PV / battery / load power for the connected device |
| `GET /api/heat` | [HEAT Cloud API](https://doc.heat-solutions.com/cloud-api) | Grid / PV / battery / load power and battery state of charge for the account's site |
| `GET /api/spot-price` | [aWATTar](https://www.awattar.de) | Current EPEX day-ahead spot price (DE-LU), cached 15 minutes |
| `POST /api/auth`, `POST /api/auth/logout` | — | Login / logout, issues and clears the session cookie |

Integration credentials and endpoints are configured entirely via environment variables (see
below) — no API keys live in code.

## Data model

Defined in [prisma/schema.prisma](prisma/schema.prisma):

- **Tenant** — a customer or supplier organization (`TenantType: CUSTOMER | SUPPLIER`).
- **User** — a login account with a `UserRole` (`ADMIN | CUSTOMER | SUPPLIER`), optionally linked
  to a tenant.
- **Asset** — a physical/logical asset (e.g. a battery storage unit), owned by one tenant.
- **AssetTenantRelation** — join table describing how a tenant relates to an asset
  (`PROVIDED_BY | CONSUMED_BY | OPERATED_BY`).
- **NeoomEnergyFlowSnapshot** / **NeoomSiteSnapshot** — point-in-time snapshots pulled from the
  Neoom API (power flow, state of charge, site metadata, electricity price).
- **OliRawTelemetrySnapshot** / **OliTelemetry15mSnapshot** — raw and 15-minute-aggregated
  telemetry from OLI heat pump devices.

## Authentication

- Login (`POST /api/auth`) checks the email/password against the `User` table (bcrypt hash) and,
  on success, issues an `httpOnly` session cookie named `enorin_zero_session`.
- The session payload (`userId`, `email`, `role`, `tenantId`, `exp`) is base64url-encoded and
  HMAC-SHA256 signed with `AUTH_SECRET` — not encrypted, so it must never contain secrets.
- Sessions expire after 24 hours (`SESSION_MAX_AGE`).
- `app/page.tsx` verifies the cookie server-side before rendering the dashboard; unauthenticated
  requests are redirected to `/login`.
- Logout is handled by `POST /api/auth/logout`, which clears the cookie.

## Environment variables

Copy these into a local `.env` (already git-ignored) or into the runtime env file used by your
deployment:

| Variable                 | Purpose                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string used by Prisma at runtime.               |
| `SHADOW_DATABASE_URL`      | Shadow database used by Prisma Migrate in development.                |
| `AUTH_SECRET`              | HMAC signing secret for session cookies. Must be set, or auth fails.  |
| `INITIAL_ADMIN_PASSWORD`   | Plaintext password used once by `scripts/create-admin.ts`.            |
| `INEXOGY_CONSUMER_KEY` / `INEXOGY_CONSUMER_SECRET` | inexogy OAuth1 consumer credentials.         |
| `INEXOGY_ACCESS_TOKEN` / `INEXOGY_TOKEN_SECRET`    | inexogy OAuth1 access token.                 |
| `SIGENCLOUD_LOGIN_KEY`     | Sigen Cloud OpenAPI login key.                                        |
| `WEYLAND_API_URL`          | Weyland Open Platform base URL.                                       |
| `WEYLAND_USERNAME` / `WEYLAND_PASSWORD` | Weyland account credentials.                             |
| `WEYLAND_CLIENT_ID` / `WEYLAND_DEVICE_SN` | Weyland client/device identifiers.                     |
| `HEAT_API_KEY`             | HEAT Cloud API bearer token (`KEY-ID.KEY-SECRET`).                     |
| `HEAT_SITE_ID`              | Optional: fixed HEAT site ID. If unset, the first site on the account is used. |

Never commit real values — `.env*` is excluded via [.gitignore](.gitignore). Any route whose
provider credentials are missing or invalid simply returns its `fallback` payload rather than
erroring.

## Getting started

```bash
npm install

# Apply migrations to your local database
npx prisma migrate dev

# Create the initial admin user (admin@enorin.de), reading
# INITIAL_ADMIN_PASSWORD from the environment
npx tsx scripts/create-admin.ts

npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Available scripts

```bash
npm run dev     # Start the dev server (webpack)
npm run build   # Production build
npm run start   # Start the production server (after build)
npm run lint    # Run ESLint
```

## Docker

The app ships as a Next.js standalone server (`output: "standalone"` in `next.config.ts`) built via
a multi-stage [Dockerfile](Dockerfile):

```bash
docker build -t enorin-zero .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  enorin-zero
# → http://localhost:3000
```

The container listens on `PORT=3000` / `HOSTNAME=0.0.0.0`.

## Deployment

Deployment runs via Coolify using the Dockerfile build pack — see [DEPLOY.md](DEPLOY.md) for the
one-time setup (repository, branch, port, domain/SSL). Pushes to `main` deploy automatically once
"Automatic Deployment" is enabled.

## Debugging

Container status and logs:

```bash
docker ps --filter name=enorin-zero-next
docker logs --tail 100 enorin-zero-next
docker logs -f --tail 20 enorin-zero-next   # live logs, Ctrl+C to stop
```

Common failure patterns:

| Symptom                              | Likely cause                                            |
| -------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL is not set`               | Runtime env file missing or not passed to Docker.           |
| `AUTH_SECRET must be set`                | Secret missing at runtime.                                    |
| Prisma `P1001`                           | Wrong DB host, firewall, routing, or wrong port.               |
| `password authentication failed`         | Incorrect credentials or improperly URL-encoded connection string. |
| Database or relation does not exist       | Wrong DB name or missing migrations.                            |

Do not solve infrastructure errors by weakening authentication or exposing detailed errors to the
browser.

## Working on this codebase

Before changing authentication, Prisma, deployment, infrastructure, or tenant-related code:

1. Read the affected files and the Prisma schema first.
2. Check the working tree and active branch.
3. Identify whether the code path is server-side, client-side, or both.
4. Confirm which environment variables are required, without revealing their values.
5. Check whether the change affects build-time or runtime behavior.
6. Add or update tests where available.
7. Run `npm run build` before deploying.
8. For schema changes, plan and review the migration strategy (`prisma/migrations/`).
9. Deploy only after checking the target environment and backup expectations.
10. After deploying, verify login, logout, protected-route behavior, database connectivity, and
    tenant/role restrictions.

Do not replace whole files blindly — the repository contains multiple prototype and exported
artefacts alongside the current implementation.

## Quick reference

```text
Application:       ENORIN ZERO
Framework:         Next.js 16.3.4
Language:          TypeScript
Runtime:           Node.js 22
Database:          PostgreSQL
ORM:               Prisma 7.9.1 with @prisma/adapter-pg
App port:          3000
Session cookie:    enorin_zero_session
Session lifetime:  24 hours
Roles:             ADMIN, CUSTOMER, SUPPLIER
```
