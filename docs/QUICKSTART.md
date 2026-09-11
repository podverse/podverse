# Quick Start Guide

One local process: tear the stack down, regenerate env, recreate infra and the
dev database, then run the full watch stack (web, API, **admin**, test-assets),
parser workers, and the mobile app.

This is **not** the Maestro E2E stack (API on `:4230`, `mobile:dev:e2e`). For that,
see [apps/mobile/e2e/HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

All commands are from the **monorepo root**. Use the named tabs in
[`.vscode/terminals.json`](/.vscode/terminals.json).

## Terminals

| Tab                | Use in this walkthrough                                           | Leave running?        |
| ------------------ | ----------------------------------------------------------------- | --------------------- |
| **Root**           | One-shot env, deps, package/worker builds, optional feed seed     | No                    |
| **Docker**         | Teardown, `local_setup` / `local_infra_up`                        | No (containers stay)  |
| **Dev**            | `npm run dev:all:watch` (main + management, packages, compile)    | **Yes**               |
| **Workers**        | Parser **consumers** (`npm run dev:workers:parsers`)              | **Yes**               |
| **Mobile**         | One-shot mobile install/prebuild/health                           | No                    |
| **Mobile Metro**   | `npm run mobile:dev` (local API on `:3000`)                       | **Yes**               |
| **Mobile iOS**     | `npm run mobile:ios -- --device "iPhone 17 Pro"`                  | No (exits; app stays) |
| **Mobile Android** | `npm run mobile:android -- --device Pixel_6_Pro_API_33`           | No (exits; app stays) |

Do **not** start **Mobile E2E API** or `mobile:dev:e2e` for this flow. Those point
the app at the E2E API on `:4230`, not your local Docker Postgres.

`npm run dev:workers` and the `workers` lane inside `dev:all:watch` only
**recompile** `apps/workers`. They do **not** consume message-queue jobs.
Queue-backed add, import, and live parse stay stuck until **Workers** is
running `dev:workers:parsers`.

## Prerequisites

- **Docker Desktop** — [Install Docker](https://docs.docker.com/get-docker/).
  Verify with `docker info`.
- **Node.js 24 LTS** — repo flake via direnv / `./scripts/nix/with-env`, or
  [nvm](https://github.com/nvm-sh/nvm) (see root `.nvmrc`).
  [CURSOR-NIX-WITH-ENV.md](development/tooling/CURSOR-NIX-WITH-ENV.md)
- **Git**
- **Xcode** + iOS Simulator (for mobile iOS)
- **Android Studio** + AVD `Pixel_6_Pro_API_33` (for mobile Android)
- Podcast Index API keys in home overrides if you want directory search or
  trending seed (`~/.config/podverse/local-env-overrides/podcast-index.env`)

Native toolchain detail: [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md).

### Fresh clone (first machine only)

```bash
git clone https://github.com/podverse/podverse.git
cd podverse
```

Then start at [step 2](#2-env-overrides-and-generation) (nothing to tear down).
`nvm use` is optional if direnv already loads the flake.

## 1. Teardown

**Docker.** Stop containers and **wipe volumes** (Postgres, Artemis, Valkey).
Images stay.

```bash
make local_clean
```

Then remove generated app/infra env files (home overrides are **not** deleted).
This refuses to run if any `podverse_local_*` container is still up.

```bash
make local_env_clean
```

Use `make local_all_down` instead of `local_clean` when you only want to stop
infra and **keep** the existing database.

Do not delete `~/.config/podverse/local-env-overrides/`. That directory is the
durable copy of your keys and auto-generated DB/MQ/JWT secrets.

## 2. Env overrides and generation

**Root.**

```bash
make local_env_prepare
make local_env_link
```

Edit home overrides if this machine does not already have them. The usual
search/seed file is `podcast-index.env` (`PODCAST_INDEX_AUTH_KEY`,
`PODCAST_INDEX_SECRET_KEY`).

Work trees share those home files: in each new work tree run `make local_env_link`
then `make local_env_setup`. One-shot new work tree:
`make start_feature_worktree`. Details:
[LOCAL-ENV-OVERRIDES.md](development/env/LOCAL-ENV-OVERRIDES.md).

Then generate app `.env` files (including `apps/mobile/.env` and both web
sidecars) and `infra/config/local/*.env`:

```bash
make local_env_setup
```

`local_env_setup` creates missing runtime env, auto-generates passwords/keys, and
applies overrides. Docker Compose uses `infra/config/local/*.env` (service
names). npm apps use `apps/*/.env` / `.env.local` (localhost). Web and
management-web `.env.local` contain only `RUNTIME_CONFIG_URL`; sidecars use
`apps/web/sidecar/.env` and `apps/management-web/sidecar/.env`.

Mobile `EXPO_PUBLIC_MOBILE_API_BASE_URL_{IOS,ANDROID}` is derived from the
shared local API host (iOS `localhost:3000`, Android emulator `10.0.2.2:3000`,
both with `/api/v2`).

## 3. Recreate infra and seed the database

**Docker.** `local_setup` runs env setup again (safe if you already did step 2),
starts Postgres / Artemis / Valkey / pgAdmin, applies linear migrations, and
seeds local app login accounts.

```bash
make local_setup
```

Wait until it prints `Local environment ready!`.

Only run `local_setup` for initial setup or after `local_clean`. Later restarts:
`make local_infra_up`. If you ran `local_env_setup` and `local_infra_up`
separately, run `make local_db_init` so the Postgres roles exist
(`podverse_app_read`, `podverse_app_read_write`,
`podverse_management_read`, `podverse_management_read_write`).

App accounts come from
[`local-dev-accounts.sql`](/infra/development/seeds/local-dev-accounts.sql).
Password for operator and dummy accounts: `Test!1Aa`. All are verified and
public so `/profile/{id_text}` resolves. Mobile `__DEV__` login prefills the
premium account (not during E2E).

| Surface    | Login                         | Notes                                      |
| ---------- | ----------------------------- | ------------------------------------------ |
| App        | `local-trial@example.com`     | Trial membership (1 year from seed)        |
| App        | `local-premium@example.com`   | Premium membership (1 year from seed)      |
| App dummy  | `dummy01@podverse.local`–`dummy06@podverse.local` | Public catalog users; username `dummyNN`; id_text `dummyuserNN` |
| Management | `superuser@example.com`       | Created in the next command; password same |

Dummy emails use `@podverse.local` and the `dummyNN` prefix so they stay off
E2E (`e2e-*`), API tests (`*-test@example.com`), and the embed `demo`
account. Re-run `make local_db_init` on an existing local DB to add them.

`local_setup` does **not** create the management admin and does **not** insert
podcasts. Create the admin next, still in **Docker**:

```bash
make local_management_superuser_create
```

Default username `superuser`, stored email `superuser@example.com`, password
`Test!1Aa`. Management web: http://localhost:3102 after step 5.

Podcasts: see [Optional podcast data](#optional-podcast-data) after the watch
stack is up.

## 4. Install JS deps and native trees

**Root** (or **Mobile** for the mobile-only lines). First clone / wiped
`node_modules` / missing `ios/` + `android/`:

```bash
npm run deps:init:native
```

That **includes** root `npm install` (do not run `npm install` first). It then
builds packages, installs standalone `apps/mobile`, and runs Expo prebuild +
CocoaPods. Root `npm install` alone never installs mobile (outside workspaces).

If root + mobile JS are already installed and you only need packages:

```bash
npm run build:packages
```

If native trees already exist and you only need a JS reinstall:

```bash
npm run deps:init
```

Do **not** wrap `mobile:ios` / `mobile:android` / `mobile:prebuild` with
`./scripts/nix/with-env` — those scripts strip Nix so Xcode/Gradle use the host
toolchain.

## 5. Full stack with watch (leave running)

**Docker** first if you just rebooted the machine (skip after a fresh
`local_setup`):

```bash
make local_infra_up
npm run check:dev-deps
```

`dev:all:watch` starts Node apps only. It does not start Postgres, Artemis, or
Valkey.

**Dev** (leave running):

```bash
npm run dev:all:watch
```

This starts package watch, workers **compile** watch, API (`:3000`), web sidecar,
test-assets (`:2111`), web (`:3002`), management API (`:3100`), management-web
sidecar, and management-web (`:3102`).

Wait until the API answers. Run the curl in **Root** or **Mobile**, not in
**Dev**:

```bash
curl http://localhost:3000/api/v2/meta
```

Focused alternatives (same infra prerequisite): `npm run dev:main:all` (no
admin), `npm run dev:management:all` (admin only), or individual
`npm run dev:api` / `dev:web` / `dev:management-api` / `dev:management-web`.

## 6. Parser workers (leave running)

**Workers.** After `apps/workers/dist` exists (`dev:all:watch` builds it, or run
`npm run build -w apps/workers` in **Root**):

```bash
npm run dev:workers:parsers
```

That starts the long-running MQ consumers (not crons): `rss-on-demand`
(Podcast Index **Add**), `rss-normal` (background / batch RSS), `rss-live`,
`add-by-rss-on-demand`, `add-by-rss-background`, `opml-import`, and the
live-item listener (enqueues to `rss-live`). Leave it running.

Restart this tab after you change worker source; compile watch updates `dist/`,
but the already-started Node processes do not reload.

Image shrink and the DLQ consumer are not in this script. Image shrink exits
immediately unless `BUCKET_PROVIDER` is set:

```bash
npm run image_shrink_run_consumer -w apps/workers
```

Docker alternative (builds a workers image; parser-queue subset only; do
**not** also run `dev:workers:parsers`):

```bash
make local_run_parsers_all
```

Stop those containers with `make local_stop_parsers`.

## Optional podcast data

`local_setup` seeds **users only**. To put real channels in the app DB:

**Root**, after packages + workers are built, and with Podcast Index keys set:

```bash
npm run workers:parse_podcasting20_feeds
npm run workers:parse_trending_feeds -- -max 50
npm run workers:seed_local_user_content
npm run workers:seed_simulated_stats
```

These write straight to Postgres (no running consumer required). Directory
**search** in the app still needs the PI keys. **Add podcast** / add-by-RSS then
need the **Workers** consumers from step 6.

`workers:seed_local_user_content` gives the operator login accounts and
`dummy01`–`dummy06` overlapping follows, public AV clips (15–30s in the first
90s), and public playlists. It does not write stats. Idempotent. Requires the
dummy rows from `local-dev-accounts.sql` (re-run `make local_db_init` if those
emails are missing). Run it after parse so clips and playlists exist before
stats.

`workers:seed_simulated_stats` writes staggered listen counts onto public
channels (and a cap of newest episodes per show), plus public clips, playlists,
and accounts when those rows exist. It does not insert a stats row for the
whole catalog. Re-run it after another parse or another user-content seed.
Optional `-itemsPerChannel 30` (max 80).

Generated local RSS (no PI keys):
[LOCAL-PARSER-WORKER-FEED-TEST-FLOW.md](testing/LOCAL-PARSER-WORKER-FEED-TEST-FLOW.md).

## 7. Mobile Metro (leave running)

Pick **one** command in **Mobile Metro**. Run only one Metro.

**Simulator or emulator (this walkthrough):**

```bash
npm run mobile:dev
```

Bundler on `:8081`, app talks to local API `:3000`. Use this unless you are
installing onto a USB Android phone.

**USB Android phone only** (same tab, instead of `mobile:dev` — not in
addition). Metro advertises your LAN IP so the phone can reach the API; it
does not rewrite `apps/mobile/.env`:

```bash
npm run mobile:dev:device
```

## 8. Install and launch the mobile app

**Mobile iOS** (exits when the install/launch finishes; leave Metro up):

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```

**Mobile Android** (leave Metro up; do not press `a` in Metro):

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

That installs and launches the named AVD. Android does **not** attach to Metro
by itself. After the emulator is up, this attach step is required.

**Root** — wait until `adb devices` shows `device` (not `offline`; a fresh adb
daemon can report offline for a few seconds), then:

```bash
adb devices
adb reverse tcp:8081 tcp:8081
```

`adb reverse` is ready when it prints `8081` or returns to the prompt with no
error. Then on the emulator Expo **dev launcher**, **Enter URL manually**:

`http://localhost:8081`

That URL is required. Do not use Metro’s QR / LAN IP (`10.0.0.31` and similar)
and do not use `10.0.2.2` — those hang on the loading dots and Metro never
prints `Android Bundled`. After `localhost:8081`, Metro should print
`Android Bundled` and Home should appear.

On later days, iOS usually attaches if you just open the sim. Android: re-run
`adb reverse` (it does not persist across emulator/adb restarts), then
`http://localhost:8081` again. Re-run `mobile:ios` / `mobile:android` after
native dependency or prebuild changes.

USB Android phone: **Mobile Android** `npm run mobile:android:device` (and Metro
must be `mobile:dev:device`).

Manual vs E2E device names:
[APPS-MOBILE.md § Dev client workflow](/apps/mobile/APPS-MOBILE.md#dev-client-workflow).

## Day-to-day (already set up)

| Tab                | Command                                                      |
| ------------------ | ------------------------------------------------------------ |
| **Docker**         | `make local_infra_up` then `npm run check:dev-deps`          |
| **Dev**            | `npm run dev:all:watch`                                      |
| **Workers**        | `npm run dev:workers:parsers`                                |
| **Mobile Metro**   | `npm run mobile:dev`                                         |
| **Mobile iOS**     | `npm run mobile:ios -- --device "iPhone 17 Pro"` (as needed) |
| **Mobile Android** | `npm run mobile:android -- --device Pixel_6_Pro_API_33`      |
| **Root** (Android) | `adb reverse tcp:8081 tcp:8081` then emulator URL `http://localhost:8081` |

## Verification Checklist

| Component     | URL / check                           | Expected                                                               |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Infra         | `npm run check:dev-deps` in **Root**  | Postgres `:5432`, Artemis `:5684`, Valkey `:6379`                      |
| API           | http://localhost:3000/api/v2/meta     | JSON with version info                                                 |
| Web           | http://localhost:3002                 | Homepage loads                                                         |
| Management    | http://localhost:3102                 | Admin login (`superuser@example.com` / `Test!1Aa`)                     |
| Database      | `docker ps \| grep podverse_local_db` | Container running                                                      |
| pgAdmin       | http://localhost:3050                 | Local Main (`podverse_app`), Local Management (`podverse_management`)  |
| Message Queue | http://localhost:8161                 | Artemis console                                                        |
| Cache         | http://localhost:8001                 | RedisInsight GUI                                                       |
| Metro         | **Mobile Metro** `:8081`              | Bundler banner; `iOS Bundled` / `Android Bundled` after each attach    |
| Mobile app    | Dev client on sim/emulator            | Home (not Expo launcher). Android: `adb reverse` + `http://localhost:8081` |
| Parsers       | Add a PI feed or add-by-RSS URL       | Channel becomes parsed-ready                                           |

**pgAdmin:** The password is read from a pgpass file, so you can expand Local
Main or Local Management without entering a password. For local DBs, set
`POSTGRES_DB=podverse_app` and `POSTGRES_MANAGEMENT_DB=podverse_management` in
`infra/config/local/db.env` (via `make local_env_setup`). If you see missing
database errors, either **(A)** set those env values, remove the DB volume(s),
and run `make local_db_up` so Postgres creates the DBs on first init, or
**(B)** create them manually:

```bash
docker exec -it podverse_local_db psql -U podverse_app_owner -c 'CREATE DATABASE podverse_app;'
docker exec -it podverse_local_db psql -U podverse_app_owner -c 'CREATE DATABASE podverse_management;'
```

## Stopping and restarting

```bash
# Stop all infrastructure (preserves data)
make local_all_down

# Restart services (use this, NOT local_setup)
make local_infra_up

# Stop individual services
make local_db_down
make local_pgadmin_down
make local_mq_down
make local_keyvaldb_down
```

After `local_all_down`, use `local_infra_up`. Only use `local_setup` for initial
setup or after `local_clean`.

When modifying a single package without `dev:all:watch`:

```bash
npm run build -w packages/helpers
npm run build:packages
```

## Extensions (Prometheus / OTLP)

Optional **extension-prometheus** sidecar for local metrics (OTLP from apps →
Prometheus scrape on port **9464**). Not started by `make local_infra_up`.

```bash
make local_extensions_prometheus_up
curl -fsS http://127.0.0.1:9464/extensions/prometheus/health
```

`make local_env_setup` seeds extension env from three templates:

- `infra/config/env-templates/extensions.env.example` →
  `infra/config/local/extensions.env`
- `infra/config/env-templates/extension-sidecar-otel.env.example` →
  `infra/config/local/extension-sidecar-otel.env`
- `infra/config/env-templates/extension-prometheus.env.example` →
  `infra/config/local/extension-prometheus.env`

To export metrics from an app running on the host (e.g. `npm run dev:api`):

1. Set in `apps/api/.env` (or the app you run): `PROMETHEUS_ENABLED="true"`,
   `OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"`, and
   `OTEL_SERVICE_NAME="podverse-api"`. For web/management-web, set those keys
   in `apps/*/sidecar/.env` and re-run `make local_env_setup` (copies them into
   `.env.local`).
2. Start the app and hit HTTP routes.
3. Scrape `http://127.0.0.1:9464/extensions/prometheus/metrics` (not the app
   port).

Stop the sidecar: `make local_extensions_down`. Platform capabilities:
[operations/platform/DOCS-OPERATIONS-PLATFORM.md](operations/platform/DOCS-OPERATIONS-PLATFORM.md).
Extension sidecar: [EXTENSIONS-SIDECAR.md](operations/extensions/EXTENSIONS-SIDECAR.md).
Tracing: [TRACING.md](operations/observability/TRACING.md).

## Troubleshooting

### Docker Network Error

```
Error: network podverse_local_network not found
```

**Solution**: Create the network manually:

```bash
make local_network_create
```

### Database Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure the database is running:

```bash
docker ps | grep podverse_local_db
# If not running:
make local_db_up
```

### Management Database Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

This error occurs when the management database isn't running.

**Solution**: Ensure infrastructure is running:

```bash
make local_infra_up
```

If this is your first time, run the full setup:

```bash
make local_setup
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Find and stop the process using the port:

```bash
lsof -i :3000
kill -9 <PID>
```

### Database Not Initialized

If you see migration errors or missing tables:

```bash
make local_db_reset
make local_db_init
```

### "Relation Already Exists" Errors

If you see `relation "xxx" already exists` errors when running `local_setup`:

This happens when you run `local_setup` on a database that already has data. Use
the correct command:

```bash
# To restart services (data already exists):
make local_infra_up

# For a fresh start (wipes all data):
make local_clean
make local_setup
```

### Package Build Errors

If you see "Cannot find module '@podverse/helpers'":

```bash
npm run build:packages
```

### Stale Build Cache

If you see "Could not find a declaration file for module '@podverse/...'" errors
after switching Node versions or after a failed build:

```bash
npm run clean:all
npm run build:packages
```

This removes stale `tsconfig.tsbuildinfo` files that can cause TypeScript to
skip emitting declaration files.

### Fresh Start

To completely reset your local environment (wipes all data):

```bash
make local_clean
make local_env_clean
make local_env_prepare
make local_env_link
make local_setup
make local_management_superuser_create
npm run deps:init:native
```

Then continue from [step 5](#5-full-stack-with-watch-leave-running).
`local_clean` removes containers and data volumes but preserves Docker images.

### Clean start and password alignment

Use this sequence when you want a clean slate and to ensure DB passwords stay
aligned with env files (e.g. after changing overrides or fixing authentication
failures for `podverse_app_read` / `podverse_management_read`):

```bash
make local_clean
make local_setup
```

`local_setup` runs `local_env_setup` (which populates
`infra/config/local/db.env`), then starts infra and runs DB inits. The init
scripts sync the app/management read and read_write user passwords from those
env files every time.

To remove only the generated local env files (infra + app `.env`) and keep
`dev/env-overrides/local/*.env` intact, run `make local_env_clean`. This target
refuses to run if any Podverse local containers are running; stop them first
with `make local_all_down`.

## Docker Images

### Building Docker Images

To build Docker images for local testing or deployment:

```bash
# Build all images
make local_build_all

# Build individual images
make local_build_api
make local_build_workers
make local_build_management_api
make local_build_web
make local_build_web_runtime_config
make local_build_management_web
make local_build_management_web_runtime_config
```

**Web Apps Runtime Config**: The `web` and `management-web` apps build once and
read `NEXT_PUBLIC_*` values from a runtime-config sidecar. The Makefile
commands handle image builds, but if building manually:

```bash
# Build web app and sidecar
docker build -f apps/web/Dockerfile -t podverse-web:latest .
docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:latest .

# Build management-web and sidecar
docker build -f apps/management-web/Dockerfile -t podverse-management-web:latest .
docker build -f apps/management-web/sidecar/Dockerfile -t podverse-management-web-runtime-config:latest .
```

Provide runtime env values to the sidecar at deploy time (see
`apps/web/sidecar/.env.example` and
`apps/management-web/sidecar/.env.example`).

### Testing Docker Images

After building images, you can test them with docker-compose:

```bash
# Ensure infrastructure is running first
make local_infra_up

# Test API
make local_test_api
# Check logs: docker compose -f infra/docker/local/api/docker-compose.yml logs -f
# Stop: docker compose -f infra/docker/local/api/docker-compose.yml down

# Test Workers
make local_test_workers

# Test Management API
make local_test_management_api
```

### Verifying Docker Builds

Run the verification script to check that images are optimized:

```bash
make local_test_docker_builds
```

This will:

- Build all images
- Display image sizes
- Verify that source files are excluded and only `dist/` files are present

### Docker Image Optimization

The Dockerfiles use multi-stage builds to minimize final image size:

- **Builder stage**: Installs dependencies and compiles TypeScript
- **Runner stage**: Only includes compiled `dist/` files and production
  dependencies

Final images are ~300-500MB (vs 800MB+ with single-stage builds).

## Environment Configuration

### Pre-configured Files

Local development uses pre-configured environment files:

| App            | Config File                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| API            | `apps/api/.env`                                                                                               |
| Web            | `apps/web/.env.local` (only `RUNTIME_CONFIG_URL`); sidecar uses `apps/web/sidecar/.env`                       |
| Workers        | `apps/workers/.env`                                                                                           |
| Management API | `apps/management-api/.env`                                                                                    |
| Management Web | `apps/management-web/.env.local` (only `RUNTIME_CONFIG_URL`); sidecar uses `apps/management-web/sidecar/.env` |
| Mobile         | `apps/mobile/.env`                                                                                            |

### Infrastructure Config

Docker services use configs in `infra/config/local/`:

- `db.env` - PostgreSQL settings
- `api.env` - API container settings
- `workers.env` - Workers container settings
- `management-api.env` - Management API container settings
- `web.env` - Web main container (only `RUNTIME_CONFIG_URL`; app fetches config from sidecar)
- `web-sidecar.env` - Web runtime-config sidecar values
- `management-web.env` - Management web main container (only `RUNTIME_CONFIG_URL`)
- `management-web-sidecar.env` - Management web runtime-config sidecar values
- `mq.env` - ActiveMQ Artemis settings
- `keyvaldb.env` - Valkey/Redis settings

### Customizing Configuration

See the ENV.md files in each app directory for detailed variable documentation:

- [apps/api/ENV.md](/apps/api/ENV.md)
- [apps/web/ENV.md](/apps/web/ENV.md)
- [apps/workers/ENV.md](/apps/workers/ENV.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Applications                         │
├─────────────┬─────────────┬─────────────┬───────────────┤
│   Web App   │     API     │   Workers   │  Management   │
│  (Next.js)  │  (Express)  │  (Node.js)  │   Apps        │
│  :3002      │  :3000      │             │  :3100/:3102  │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────────┘
       │             │             │
       └─────────────┼─────────────┘
                     │
┌────────────────────┼────────────────────────────────────┐
│                    │        Shared Packages             │
│  ┌─────────┐ ┌─────┴─────┐ ┌─────────┐ ┌─────────────┐  │
│  │ helpers │ │    orm    │ │ parser  │ │ notifications│  │
│  └─────────┘ └───────────┘ └─────────┘ └─────────────┘  │
│  ┌───────────────────┐     ┌─────────┐                  │
│  │ external-services │     │   mq    │                  │
│  └───────────────────┘     └─────────┘                  │
└─────────────────────────────────────────────────────────┘
                     │
┌────────────────────┼────────────────────────────────────┐
│                    │        Infrastructure              │
│  ┌─────────────┐ ┌─┴───────────┐ ┌─────────────────┐   │
│  │  PostgreSQL │ │   Artemis   │ │     Valkey      │   │
│  │    :5432    │ │    :5684    │ │     :6379       │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

- [Architecture Overview](architecture/ARCHITECTURE.md) - System design and data flow
- [Contributing Guide](development/CONTRIBUTING.md) - Development workflow and PR guidelines
- [API Documentation](/apps/api/APPS-API.md) - API endpoints and usage
- [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) - Expo / devices / troubleshooting
- [IDE-SETUP.md](development/IDE-SETUP.md) - VS Code terminals and debugging
