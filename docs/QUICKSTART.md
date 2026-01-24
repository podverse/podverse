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
- Starts PostgreSQL database
- Starts ActiveMQ Artemis message queue
- Starts Valkey (Redis-compatible) cache
- Initializes database schema and users

Alternatively, run services individually:
```bash
make local_db_up local_mq_up local_keyvaldb_up
make local_db_init
```

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

## Verification Checklist

| Component | URL | Expected |
|-----------|-----|----------|
| API | http://localhost:1234/api/v2/meta | JSON response with version info |
| Web | http://localhost:3000 | Podverse homepage loads |
| Database | `docker ps \| grep podverse_local_db` | Container running |
| Message Queue | http://localhost:8161 | Artemis console (user/mysecretpw) |
| Cache | http://localhost:8001 | RedisInsight GUI |

## Development Workflow

### Watch Mode

For active development, use watch mode to auto-rebuild on changes:

```bash
# Terminal 1: API with auto-reload
npm run dev:watch -w apps/api

# Terminal 2: Web with hot reload (default Next.js behavior)
npm run dev:web
```

### Package Development

When modifying packages, rebuild them:
```bash
# Rebuild a specific package
npm run build -w packages/helpers

# Rebuild all packages
npm run build:packages
```

### Stopping Services

```bash
# Stop all infrastructure
make local_all_down

# Stop individual services
make local_db_down
make local_mq_down
make local_keyvaldb_down
```

## Management Apps (Optional)

The management apps provide an admin interface for Podverse operations.

### Setup Management Database

```bash
make local_management_db_up
make local_management_db_init
```

This creates a superuser account:
- Email: `localadmin@podverse.fm`
- Password: `Test!1Aa`

### Run Management Apps

```bash
# Terminal 1: Management API
npm run dev:management-api    # http://localhost:1235

# Terminal 2: Management Web
npm run dev:management-web    # http://localhost:3001
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

To completely reset your local environment:
```bash
make local_clean
make local_setup
npm run build:packages
```

Note: `local_clean` removes containers and data volumes but preserves Docker images for faster restarts.

## Environment Configuration

### Pre-configured Files

Local development uses pre-configured environment files:

| App | Config File |
|-----|-------------|
| API | `apps/api/.env` |
| Web | `apps/web/env/local.env` |
| Workers | `apps/workers/.env` |
| Management API | `apps/management-api/.env` |
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
- [API Documentation](../apps/api/README.md) - API endpoints and usage
