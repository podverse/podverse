# Quick Start Guide

Get the Podverse monorepo running locally in 6 steps.

## Prerequisites

- **Docker Desktop** - [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 24 LTS** - Install via [nvm](https://github.com/nvm-sh/nvm) (we use LTS versions only; see root `.nvmrc`)
- **Git**

Verify Docker is running:

```bash
docker info
```

## Quick Start (6 Steps)

### 1. Clone and Install

```bash
git clone https://github.com/podverse/podverse.git
cd podverse
nvm use
npm install
```

### 2. Prepare Local Override Files

```bash
make local_env_prepare
```

This creates `dev/env-overrides/local/*.env` files from committed examples.
Update those files with any private or external values you use locally, then continue.

**Work trees / multiple clones:** To share one set of overrides across all work trees and clones,
use home-directory overrides: run `make local_env_link` so overrides live in
`~/.config/podverse/local-env-overrides/` and are symlinked into this repo; then run
`make local_env_setup`. In each new work tree, run `make local_env_link` then `make local_env_setup`
and you will not need to re-enter values. To create a new branch in a new work tree with env and
history ready in one step, use `make start_feature_worktree`. See [Local Env Overrides (home
directory)](development/LOCAL-ENV-OVERRIDES.md).

### 3. Generate Local Env Files and Start Infrastructure

```bash
make local_env_setup
make local_setup
```

`local_env_setup` creates missing runtime env files, auto-generates passwords/keys,
and applies override values. When you run the app stack via Docker Compose, it uses
`infra/config/local/*.env` (with Docker service names for container-to-container calls);
when you run with npm (e.g. `npm run dev:web`), use the app `.env`/`.env.local` files (localhost). For web and management-web, `.env.local` contains only `RUNTIME_CONFIG_URL`; the runtime-config sidecar uses `apps/web/sidecar/.env` and `apps/management-web/sidecar/.env` (created by `make local_env_setup`).

`local_setup` then:

- Creates the Docker network
- Starts PostgreSQL databases (main + management)
- Starts ActiveMQ Artemis message queue
- Starts Valkey (Redis-compatible) cache
- Starts pgAdmin (database browser) at `http://localhost:5051`
- Initializes database schemas and users

**Note**: Only run `local_setup` once for initial setup. To restart services later, use `make local_infra_up`. If you ran `local_env_setup` and `local_infra_up` separately (e.g. after the [prepare → link → setup](development/LOCAL-ENV-OVERRIDES.md) flow), run `make local_db_init` before starting apps so the Postgres roles (`podverse_app_read`, `podverse_app_read_write`, `podverse_management_read`, `podverse_management_read_write`) exist.

### 4. Build Packages

```bash
npm run build:packages
```

This builds all shared packages in dependency order:
`helpers` → `external-services-firebase`, `external-services-paypal`, `external-services-podcast-index` → `orm` → `notifications` → `parser` → `mq`

### 5. Start the API

```bash
npm run dev:api
```

The API starts at **http://localhost:3000**

Verify it's running:

```bash
curl http://localhost:3000/api/v2/meta
```

### 6. Start the Web App

In a new terminal:

```bash
npm run dev:web
```

The web app starts at **http://localhost:3002**

Open http://localhost:3002 in your browser - you should see the Podverse homepage.

### Local Dev Account

A test account is automatically created during setup:

- **Email:** `localdev@example.com`
- **Password:** `Test!1Aa`

This account is pre-verified with a trial membership (expires in 1 year).

## Verification Checklist

| Component     | URL                                   | Expected                                                                       |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| API           | http://localhost:3000/api/v2/meta     | JSON response with version info                                                |
| Web           | http://localhost:3002                 | Podverse homepage loads                                                        |
| Database      | `docker ps \| grep podverse_local_db` | Container running                                                              |
| pgAdmin       | http://localhost:5051                 | Two servers: Local Main (podverse_app), Local Management (podverse_management) |
| Message Queue | http://localhost:8161                 | Artemis console (user/mysecretpw)                                              |
| Cache         | http://localhost:8001                 | RedisInsight GUI                                                               |

**pgAdmin:** The password is read from a pgpass file, so you can expand Local Main or Local Management without entering a password. For local DBs, set `POSTGRES_DB=podverse_app` and `POSTGRES_MANAGEMENT_DB=podverse_management` in `infra/config/local/db.env` (e.g. via `make local_env_setup`). If you see missing database errors, either **(A)** set those env values, remove the DB volume(s), and run `make local_db_up` so Postgres creates the DBs on first init, or **(B)** create the databases manually: `docker exec -it podverse_local_db psql -U podverse_app_owner -c 'CREATE DATABASE podverse_app;'` and `docker exec -it podverse_local_db psql -U podverse_app_owner -c 'CREATE DATABASE podverse_management;'`.

## Development Workflow

### Watch Mode

For active development, use watch mode to auto-rebuild on changes:

```bash
# Terminal 1: API with auto-reload
npm run dev:watch -w apps/api

# Terminal 2: Web with hot reload (default Next.js behavior)
npm run dev:web
```

For advanced terminal configurations using VS Code Terminals Manager, see [development/IDE-SETUP.md](development/IDE-SETUP.md).

### Run Multiple Apps (dev:\*:all)

For focused development, use these commands to run packages in watch mode with specific app groups:

```bash
# Main apps only (API + Web) - most common
npm run dev:main:all

# Management apps only (requires management database)
npm run dev:management:all

# All apps (requires management database)
npm run dev:all
```

**Note**: The management database is included in `local_setup`, so all commands work out of the box.

These commands start with staggered delays for readable log output:

- Packages build sequentially (helpers → external-services → orm → notifications → parser → mq)
- Apps start after packages are ready, spaced 6 seconds apart

### Package Development

When modifying packages, rebuild them:

```bash
# Rebuild a specific package
npm run build -w packages/helpers

# Rebuild all packages
npm run build:packages
```

### Stopping and Restarting Services

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

**Important**: After `local_all_down`, use `local_infra_up` to restart. Only use `local_setup` for initial setup or after `local_clean`.

## Management Apps

The management apps provide an admin interface for Podverse operations. The management database is included in `local_setup`.

### Default Superuser Account

- Email: `localadmin@example.com`
- Password: `Test!1Aa`

### Run Management Apps

```bash
# Combined with packages in watch mode
npm run dev:management:all

# Or individually
npm run dev:management-api # http://localhost:3100
npm run dev:management-web # http://localhost:3102
```

## Workers (Optional)

Background workers process feed updates and notifications:

```bash
npm run dev:workers
```

Workers require the database, message queue, and cache to be running.

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

This happens when you run `local_setup` on a database that already has data. Use the correct command:

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

If you see "Could not find a declaration file for module '@podverse/...'" errors after switching Node versions or after a failed build:

```bash
npm run clean:all
npm run build:packages
```

This removes stale `tsconfig.tsbuildinfo` files that can cause TypeScript to skip emitting declaration files.

### Fresh Start

To completely reset your local environment (wipes all data):

```bash
make local_clean # Stops containers and removes volumes
make local_setup # Starts fresh and initializes databases
npm run build:packages
```

Note: `local_clean` removes containers and data volumes but preserves Docker images for faster restarts.

### Clean start and correct alignment

Use this sequence when you want a clean slate and to ensure DB passwords stay aligned with env
files (e.g. after changing overrides or fixing authentication failures for `podverse_app_read` / `podverse_management_read`):

**Minimal (recommended):**

```bash
make local_clean
make local_setup
npm run build:packages
```

**With override refresh (if you changed `dev/env-overrides/local/*.env`):**

```bash
make local_env_prepare   # optional: (re)create override files from examples
make local_clean
make local_setup
npm run build:packages
```

`local_setup` runs `local_env_setup` (which populates `infra/config/local/db.env`), then starts
infra and runs DB inits. The init scripts
sync the app/management read and read_write user passwords from those env files every time, so the databases
stay aligned with `local_env_setup` results.

To remove only the generated local env files (infra + app .env) and keep
`dev/env-overrides/local/*.env` intact, run `make local_env_clean`. This target will refuse to run
if any Podverse local containers are running; stop them first with `make local_all_down`.

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

**Web Apps Runtime Config**: The `web` and `management-web` apps build once and read `NEXT_PUBLIC_*` values from a runtime-config sidecar. The Makefile commands handle image builds, but if building manually:

```bash
# Build web app and sidecar
docker build -f apps/web/Dockerfile -t podverse-web:latest .
docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:latest .

# Build management-web and sidecar
docker build -f apps/management-web/Dockerfile -t podverse-management-web:latest .
docker build -f apps/management-web/sidecar/Dockerfile -t podverse-management-web-runtime-config:latest .
```

Provide runtime env values to the sidecar at deploy time (see `apps/web/sidecar/.env.example` and `apps/management-web/sidecar/.env.example`).

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
- **Runner stage**: Only includes compiled `dist/` files and production dependencies

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

- [apps/api/ENV.md](../apps/api/ENV.md)
- [apps/web/ENV.md](../apps/web/ENV.md)
- [apps/workers/ENV.md](../apps/workers/ENV.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Applications                         │
├─────────────┬─────────────┬─────────────┬───────────────┤
│   Web App   │     API     │   Workers   │  Management   │
│  (Next.js)  │  (Express)  │  (Node.js)  │   Apps        │
│  :3002      │  :3000      │             │  :3100/:3101  │
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
│  │    :5432    │ │    :5672    │ │     :6379       │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

- [Architecture Overview](architecture/ARCHITECTURE.md) - System design and data flow
- [Contributing Guide](development/CONTRIBUTING.md) - Development workflow and PR guidelines
- [API Documentation](../apps/api/APPS-API.md) - API endpoints and usage
