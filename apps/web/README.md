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
