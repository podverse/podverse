# @podverse/management-web

Administrative management interface for Podverse.

## Overview

Podverse Management Web is a Next.js application providing administrative tools for the Podverse support team. It connects to the Podverse Management API for backend operations.

## Quick Start

### Prerequisites

- Node.js v24+
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

Development mode (port 3100):

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

The management-web image is build-once and expects runtime config via a sidecar service.

```bash
# Build the management-web app image (from monorepo root)
docker build -f apps/management-web/Dockerfile -t podverse-management-web:latest .

# Build the runtime config sidecar image
docker build -f apps/management-web/sidecar/Dockerfile -t podverse-management-web-runtime-config:latest .
```

Runtime configuration is provided to the sidecar at deploy time using the env files in `apps/management-web/env/`.

The Makefile provides convenient shortcuts:

```bash
# From monorepo root
make local_build_management_web
make local_build_management_web_runtime_config
```

### Dockerfile Structure

The management-web Dockerfile builds the Next.js app without baking env files. Runtime configuration is supplied by the sidecar service at startup.

## Environment Files

Environment-specific configurations are in the `env/` directory. These are loaded into the runtime-config sidecar at deploy time:

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
