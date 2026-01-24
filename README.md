# Podverse

Open source podcast app with Podcasting 2.0 support.

## Features

- **Value4Value / Lightning payments** - Support creators directly
- **Chapters, transcripts, soundbites** - Enhanced podcast experience
- **Cross-platform** - iOS, Android, F-Droid, Web
- **Self-hostable** - Run your own instance

## Quick Start

```bash
nvm use && npm install
npm run build:packages
npm run dev:api    # localhost:3000
npm run dev:web    # localhost:3001
```

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

```bash
# Clone and install
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install

# Build packages (required before running apps)
npm run build:packages

# Start development servers
npm run dev:api    # API at localhost:3000
npm run dev:web    # Web at localhost:3001
```

### Environment Setup

Copy environment templates from `infra/config/env-templates/`:

```bash
cp infra/config/env-templates/*.example infra/config/local/
# Edit files in infra/config/local/ with your values
```

See [docs/ENV.md](docs/ENV.md) for all environment variable documentation.

### Docker Development

For local services (database, cache, message queue):

```bash
cd infra/docker/local
docker-compose up -d
```

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
