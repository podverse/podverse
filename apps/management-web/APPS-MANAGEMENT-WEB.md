# @podverse/management-web

Administrative management interface for Podverse.

## Overview

Podverse Management Web is a Next.js application providing administrative tools for the Podverse support team. It connects to the Podverse Management API for backend operations.

## Quick Start

### Prerequisites

- Node.js v22+
- Podverse Management API running (see `apps/management-api`)

### Setup

1. Install dependencies from the monorepo root:

```bash
npm install
```

2. Configure environment:

For local development, copy the local environment file:

```bash
cp env/local.env .env.local
```

See [ENV.md](ENV.md) for detailed documentation of all environment variables.

3. Build the packages (from monorepo root):

```bash
npm run build:packages
```

### Running

Development mode (port 3999):

```bash
npm run dev:management-web
```

Development mode with hot reload:

```bash
npm run dev:watch -w apps/management-web
```

Build for production:

```bash
npm run build -w apps/management-web
```

Start production server:

```bash
npm run start -w apps/management-web
```

## Docker

### Building Docker Images

The management-web app uses a DRY Dockerfile structure that requires the `ENV_FILE` build argument to specify which environment configuration to use:

```bash
# Build for local environment (from monorepo root)
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/local.env -t podverse-management-web:latest .

# Build for alpha environment
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/alpha.env -t podverse-management-web:alpha .

# Build for beta environment
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/beta.env -t podverse-management-web:beta .

# Build for production environment
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/production.env -t podverse-management-web:prod .
```

**Important**: The `ENV_FILE` build argument is **required** - builds will fail if it's not provided. This ensures explicit environment selection and prevents accidental builds with the wrong configuration.

The Makefile provides convenient shortcuts:

```bash
# From monorepo root
make local_build_management_web # Builds with local.env
```

### Dockerfile Structure

The Dockerfile uses a single source of truth for build logic, with only the environment file path varying between environments. This DRY approach eliminates duplication while maintaining clear environment separation.

## Environment Files

Environment-specific configurations are in the `env/` directory:

| File                 | Environment       |
| -------------------- | ----------------- |
| `env/local.env`      | Local development |
| `env/alpha.env`      | Alpha/staging     |
| `env/beta.env`       | Beta              |
| `env/production.env` | Production        |

Copy the appropriate file to `.env.local` for your environment.

## Environment Configuration

See [ENV.md](ENV.md) for complete documentation of all environment variables.

Key configuration:

- `NEXT_PUBLIC_API_HOST` - Management API host
- `NEXT_PUBLIC_API_PORT` - Management API port (default: 1999)

## License

AGPLv3
