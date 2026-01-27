# @podverse/web

Main web application for Podverse - a Next.js application for discovering and listening to podcasts.

## Overview

The Podverse web app provides a full-featured podcast client in the browser, supporting clip creation, playlists, premium memberships, and value-for-value payments.

## Quick Start

### Prerequisites

- Node.js v22+
- Podverse API running (see `apps/api`)

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

Development mode:

```bash
npm run dev:web
```

Development mode with hot reload:

```bash
npm run dev:watch -w apps/web
```

Build for production:

```bash
npm run build -w apps/web
```

Start production server:

```bash
npm run start -w apps/web
```

## Docker

### Building Docker Images

The web app uses a DRY Dockerfile structure that requires the `ENV_FILE` build argument to specify which environment configuration to use:

```bash
# Build for local environment (from monorepo root)
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/local.env -t podverse-web:latest .

# Build for alpha environment
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/alpha.env -t podverse-web:alpha .
```

**Important**: The `ENV_FILE` build argument is **required** - builds will fail if it's not provided. This ensures explicit environment selection and prevents accidental builds with the wrong configuration.

The Makefile provides convenient shortcuts:
```bash
# From monorepo root
make local_build_web  # Builds with local.env
```

### Dockerfile Structure

The Dockerfile uses a single source of truth for build logic, with only the environment file path varying between environments. This DRY approach eliminates duplication while maintaining clear environment separation.

## Environment Files

Environment-specific configurations are in the `env/` directory:

| File | Environment |
|------|-------------|
| `env/local.env` | Local development |
| `env/alpha.env` | Alpha/staging |

Copy the appropriate file to `.env.local` for your environment.

## Features

- Podcast browsing and search
- Episode playback with custom player
- Clip creation and sharing
- User playlists
- Premium membership features
- Value-for-value (V4V) payments
- Multi-language support (i18n)
- Multiple themes (dark, light, dracula)
- WebPush notifications

## License

AGPLv3
