# Podverse

Open source podcast app with Podcasting 2.0 support.

## Features

- **Value4Value / Lightning payments** - Support creators directly
- **Chapters, transcripts, soundbites** - Enhanced podcast experience
- **Cross-platform** - iOS, Android, F-Droid, Web
- **Self-hostable** - Run your own instance

## Quick Start

**Prerequisites**: [Docker](https://docs.docker.com/get-docker/) and [Node.js 22 LTS](https://github.com/nvm-sh/nvm)

```bash
# 1. Clone and install
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install

# 2. Prepare override files and add private values
make local_env_prepare

# 3. Generate local env files, then start infrastructure and initialize database
make local_env_setup
make local_setup

# 4. Build packages
npm run build:packages

# 5. Run apps (in separate terminals)
npm run dev:api # http://localhost:1234
npm run dev:web # http://localhost:3000
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
  web-perf/         # Performance testing (Bundle Analyzer, Lighthouse)

infra/              # Infrastructure
  config/           # Environment templates
  database/         # Migrations and seeds
  docker/           # Docker compose files
  pipelines/        # Jenkins pipelines

scripts/            # Utility scripts
docs/               # Documentation
logs/               # Log files (gitignored, see logs/LOGS.md)
.llm/               # LLM context and history
```

## Development

### Environment Configuration

Local development uses pre-configured environment files that work out of the box:

- `apps/api/.env` - API configuration
- `apps/web/.env.local` - Web configuration
- `apps/management-web/.env.local` - Management web configuration
- `infra/config/local/*.env` - Docker service configuration
- `dev/env-overrides/local/*.env` - Local-only private/external overrides (created by `make local_env_prepare`)

For customization, see the ENV.md files in each app directory.

### Docker

Build Docker images for local testing or deployment:

```bash
make local_build_all          # Build all images
make local_test_docker_builds # Build and verify images
```

For local infrastructure browsing, pgAdmin is available at `http://localhost:5051` after `make local_setup` or `make local_infra_up`.

**Note**: The web apps (`web` and `management-web`) build once and read `NEXT_PUBLIC_*` values from a runtime-config sidecar:

```bash
# Build web app and sidecar
docker build -f apps/web/Dockerfile -t podverse-web:latest .
docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:latest .
```

Provide runtime env values to the sidecar at deploy time using `apps/web/env/` and `apps/management-web/env/`.

See [docs/QUICKSTART.md](docs/QUICKSTART.md#docker-images) for detailed Docker instructions.

## Deployment

Deployments are managed via Jenkins pipelines. See:

- `infra/pipelines/` - Jenkins pipeline definitions
- Individual app `README.md` files for app-specific deployment notes

## Performance Testing

Performance testing tools are available in `tools/web-perf/`:

- **Bundle Analyzer**: Analyze Next.js bundle sizes and visualize code splitting
- **Lighthouse**: Automated performance testing with Playwright and Lighthouse

See [tools/web-perf/README.md](tools/web-perf/README.md) for detailed instructions.

## Documentation

- [Quick Start](docs/QUICKSTART.md) - Setup and running locally
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design and data flow
- [Contributing](docs/development/CONTRIBUTING.md) - Development workflow and PR guidelines
- [IDE Setup](docs/development/IDE-SETUP.md) - VS Code configuration and debugging

## License

AGPL-3.0
