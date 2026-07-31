# @podverse/web

Main web application for Podverse - a Next.js application for discovering and listening to podcasts.

## Overview

The Podverse web app provides a full-featured podcast client in the browser, supporting clip creation, playlists, premium memberships, and value-for-value payments.

## Quick Start

### Prerequisites

- Node.js v24+
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

The web app image is build-once and expects runtime config via a sidecar service.

```bash
# Build the web app image (from monorepo root)
docker build -f apps/web/Dockerfile -t podverse-web:latest .

# Build the runtime config sidecar image
docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:latest .
```

Runtime configuration is provided to the sidecar at deploy time using the env files in `apps/web/env/`.

The Makefile provides convenient shortcuts:

```bash
# From monorepo root
make local_build_web
make local_build_web_runtime_config
```

### Dockerfile Structure

The web app Dockerfile builds the Next.js app without baking env files. Runtime configuration is supplied by the sidecar service at startup.

## Environment Files

Environment-specific configurations are in the `env/` directory. These are loaded into the runtime-config sidecar at deploy time:

| File            | Environment       |
| --------------- | ----------------- |
| `env/local.env` | Local development |
| `env/alpha.env` | Alpha/staging     |

Copy the appropriate file to `.env.local` for your environment.

## Features

- Podcast browsing and search
- Episode playback with custom player
- Clip creation and sharing
- User playlists
- OPML import/export (Settings → OPML; see [docs/features/OPML.md](/docs/features/OPML.md))
- Premium membership features
- Value-for-value (V4V) payments
- Multi-language support (i18n)
- Multiple themes (dark, light, dracula)
- WebPush notifications

## License

AGPLv3
