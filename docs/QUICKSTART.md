# Quick Start Guide

Get the Podverse monorepo running locally in 5 steps.

## Prerequisites

- **Docker Desktop** - [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 22+** - Install via [nvm](https://github.com/nvm-sh/nvm)
- **Git**

Verify Docker is running:

```bash
docker info
```

## Quick Start (5 Steps)

### 1. Clone and Install

```bash
git clone https://github.com/podverse/podverse.git
cd podverse
nvm use
npm install
```

### 2. Start Infrastructure Services

```bash
make local_setup
```

This single command:

- Creates the Docker network
- Starts PostgreSQL databases (main + management)
- Starts ActiveMQ Artemis message queue
- Starts Valkey (Redis-compatible) cache
- Initializes database schemas and users

**Note**: Only run `local_setup` once for initial setup. To restart services later, use `make local_infra_up`.

### 3. Build Packages

```bash
npm run build:packages
```

This builds all shared packages in dependency order:
`helpers` → `external-services` → `orm` → `notifications` → `parser` → `mq`

### 4. Start the API

```bash
npm run dev:api
```

The API starts at **http://localhost:1234**

Verify it's running:

```bash
curl http://localhost:1234/api/v2/meta
```

### 5. Start the Web App

In a new terminal:

```bash
npm run dev:web
```

The web app starts at **http://localhost:3000**

Open http://localhost:3000 in your browser - you should see the Podverse homepage.

### Local Dev Account

A test account is automatically created during setup:

- **Email:** `localdev@example.com`
- **Password:** `Test!1Aa`

This account is pre-verified with a trial membership (expires in 1 year).

## Verification Checklist

| Component     | URL                                   | Expected                          |
| ------------- | ------------------------------------- | --------------------------------- |
| API           | http://localhost:1234/api/v2/meta     | JSON response with version info   |
| Web           | http://localhost:3000                 | Podverse homepage loads           |
| Database      | `docker ps \| grep podverse_local_db` | Container running                 |
| Message Queue | http://localhost:8161                 | Artemis console (user/mysecretpw) |
| Cache         | http://localhost:8001                 | RedisInsight GUI                  |

## Development Workflow

### Watch Mode

For active development, use watch mode to auto-rebuild on changes:

```bash
# Terminal 1: API with auto-reload
npm run dev:watch -w apps/api

# Terminal 2: Web with hot reload (default Next.js behavior)
npm run dev:web
```

For advanced terminal configurations using VS Code Terminals Manager, see [IDE-SETUP.md](IDE-SETUP.md).

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
npm run dev:management-api    # http://localhost:1235
npm run dev:management-web    # http://localhost:3999
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
Error: connect ECONNREFUSED 127.0.0.1:5999
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
Error: listen EADDRINUSE: address already in use :::1234
```

**Solution**: Find and stop the process using the port:

```bash
lsof -i :1234
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
make local_clean      # Stops containers and removes volumes
make local_setup      # Starts fresh and initializes databases
npm run build:packages
```

Note: `local_clean` removes containers and data volumes but preserves Docker images for faster restarts.

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
make local_build_management_web
```

**Web Apps Build Arguments**: The `web` and `management-web` apps use a DRY Dockerfile structure that requires the `ENV_FILE` build argument to specify which environment configuration to use. The Makefile commands handle this automatically, but if building manually:

```bash
# Build web app for local environment
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/local.env -t podverse-web:latest .

# Build web app for alpha environment
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/alpha.env -t podverse-web:alpha .

# Build management-web for local environment
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/local.env -t podverse-management-web:latest .

# Build management-web for alpha environment
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/alpha.env -t podverse-management-web:alpha .
```

**Important**: The `ENV_FILE` build argument is **required** - builds will fail if it's not provided. This ensures explicit environment selection and prevents accidental builds with the wrong configuration. The Dockerfile uses a single source of truth for build logic, with only the environment file path varying between environments.

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

| App            | Config File                         |
| -------------- | ----------------------------------- |
| API            | `apps/api/.env`                     |
| Web            | `apps/web/env/local.env`            |
| Workers        | `apps/workers/.env`                 |
| Management API | `apps/management-api/.env`          |
| Management Web | `apps/management-web/env/local.env` |

### Infrastructure Config

Docker services use configs in `infra/config/local/`:

- `db.env` - PostgreSQL settings
- `mq.env` - ActiveMQ Artemis settings
- `keyvaldb.env` - Valkey/Redis settings
- `management-db.env` - Management PostgreSQL settings

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
│  :3000      │  :1234      │             │  :1235/:3001  │
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

- [Architecture Overview](ARCHITECTURE.md) - System design and data flow
- [Contributing Guide](CONTRIBUTING.md) - Development workflow and PR guidelines
- [API Documentation](../apps/api/APPS-API.md) - API endpoints and usage
