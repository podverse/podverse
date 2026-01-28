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

scripts/            # Utility scripts
pipelines/          # Jenkins pipelines
docs/               # Documentation
logs/               # Log files (gitignored, see logs/LOGS.md)
.llm/               # LLM context and history
```

## Development

### Environment Configuration

Local development uses pre-configured environment files that work out of the box:

- `apps/api/.env` - API configuration
- `apps/web/env/local.env` - Web configuration
- `infra/config/local/*.env` - Docker service configuration

For customization, see the ENV.md files in each app directory.

### Docker

Build Docker images for local testing or deployment:

```bash
make local_build_all          # Build all images
make local_test_docker_builds # Build and verify images
```

**Note**: The web apps (`web` and `management-web`) use a DRY Dockerfile structure that requires a build argument to specify the environment file:

```bash
# Build web app for local environment
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/local.env -t podverse-web:latest .

# Build web app for alpha environment
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/alpha.env -t podverse-web:alpha .
```

The `ENV_FILE` build argument is **required** - builds will fail if it's not provided. This ensures explicit environment selection and prevents accidental builds with the wrong configuration.

See [docs/QUICKSTART.md](docs/QUICKSTART.md#docker-images) for detailed Docker instructions.

## Deployment

Deployments are managed via Jenkins pipelines. See:

- `pipelines/` - Jenkins pipeline definitions
- Individual app `README.md` files for app-specific deployment notes

## Performance Testing

Performance testing tools are available in `tools/web-perf/`:

- **Bundle Analyzer**: Analyze Next.js bundle sizes and visualize code splitting
- **Lighthouse**: Automated performance testing with Playwright and Lighthouse

See [tools/web-perf/README.md](tools/web-perf/README.md) for detailed instructions.

## Documentation

- [Quick Start](docs/QUICKSTART.md) - Setup and running locally
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Contributing](docs/CONTRIBUTING.md) - Development workflow and PR guidelines
- [IDE Setup](docs/IDE-SETUP.md) - VS Code configuration and debugging

## License

AGPL-3.0
