# Podverse

Open source podcast app with Podcasting 2.0 support.

## Features

- **Value4Value / Lightning payments** - Support creators directly
- **Chapters, transcripts, soundbites** - Enhanced podcast experience
- **Cross-platform** - iOS, Android, F-Droid, Web
- **Self-hostable** - Run your own instance

## Quick Start

**Prerequisites**: [Docker](https://docs.docker.com/get-docker/) and [Node.js 22+](https://github.com/nvm-sh/nvm)

```bash
# 1. Clone and install
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install

# 2. Start infrastructure and initialize database
make local_setup

# 3. Build packages
npm run build:packages

# 4. Run apps (in separate terminals)
npm run dev:api    # http://localhost:1234
npm run dev:web    # http://localhost:3000
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup instructions, verification steps, and troubleshooting.

## Directory Structure

```
packages/           # Publishable npm packages (@podverse/*)
  helpers/          # Shared utilities, types, DTOs
  external-services/  # Third-party integrations
  orm/              # Database entities and services
  notifications/    # Push notification services
  parser/           # RSS/Podcast feed parsing
  mq/               # Message queue operations

apps/               # Deployable applications
  api/              # REST API (Express)
  web/              # Web app (Next.js)
  workers/          # Background job processors
  management-api/   # Admin API
  management-web/   # Admin dashboard

tools/              # Development tools
  qa/               # Test data generation

infra/              # Infrastructure
  config/           # Environment templates
  database/         # Migrations and seeds
  docker/           # Docker compose files

scripts/            # Utility scripts
pipelines/          # Jenkins pipelines
docs/               # Documentation
.llm/               # LLM context and history
```

## Development

### Prerequisites

- Node.js 22+ (use `nvm use`)
- PostgreSQL 16+
- Valkey/Redis (optional, for caching)

### Setup

For a complete walkthrough, see [docs/QUICKSTART.md](docs/QUICKSTART.md).

**Quick version:**
```bash
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install
make local_setup           # Start Docker services + init database
npm run build:packages     # Build shared packages
npm run dev:api            # API at localhost:1234
npm run dev:web            # Web at localhost:3000 (new terminal)
```

### Environment Configuration

Local development uses pre-configured environment files that work out of the box:
- `apps/api/.env` - API configuration
- `apps/web/env/local.env` - Web configuration
- `infra/config/local/*.env` - Docker service configuration

For customization, see the ENV.md files in each app directory.

## Deployment

Deployments are managed via Jenkins pipelines. See:

- `pipelines/` - Jenkins pipeline definitions
- Individual app `README.md` files for app-specific deployment notes

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Contributing](docs/CONTRIBUTING.md) - Development workflow
- [Environment Variables](docs/ENV.md) - Configuration reference

## License

AGPL-3.0
