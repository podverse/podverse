# Docker Optimization - Documentation Updates

## Overview

Update documentation files to include Docker build and testing instructions.

## Files to Update

### 1. [docs/QUICKSTART.md](docs/QUICKSTART.md)

Add a new section after "Troubleshooting" and before "Environment Configuration":

```markdown
## Docker Images

### Building Docker Images

To build Docker images for local testing or deployment:

```bash
# Build all images
make local_build_all

# Build individual images
make local_build_api
make local_build_workers
make local_build_management_api
make local_build_web
make local_build_management_web
```

### Testing Docker Images

After building images, you can test them with docker-compose:

```bash
# Ensure infrastructure is running first
make local_infra_up

# Test API
make local_test_api
# Check logs: docker compose -f infra/docker/local/api/docker-compose.yml logs -f
# Stop: docker compose -f infra/docker/local/api/docker-compose.yml down

# Test Workers
make local_test_workers

# Test Management API
make local_test_management_api
```

### Verifying Docker Builds

Run the verification script to check that images are optimized:

```bash
make local_test_docker_builds
```

This will:
- Build all images
- Display image sizes
- Verify that source files are excluded and only `dist/` files are present

### Docker Image Optimization

The Dockerfiles use multi-stage builds to minimize final image size:
- **Builder stage**: Installs dependencies and compiles TypeScript
- **Runner stage**: Only includes compiled `dist/` files and production dependencies

Final images are ~300-500MB (vs 800MB+ with single-stage builds).
```

### 2. [README.md](README.md)

Add a brief Docker section after "Development" and before "Deployment":

```markdown
### Docker

Build Docker images for local testing or deployment:

```bash
make local_build_all          # Build all images
make local_test_docker_builds  # Build and verify images
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md#docker-images) for detailed Docker instructions.
```

### 3. [apps/api/README.md](apps/api/README.md)

Add Docker section after "Build for production":

```markdown
## Docker

Build Docker image:

```bash
# From monorepo root
make local_build_api

# Or directly
docker build -f apps/api/Dockerfile -t podverse-api:latest .
```

Test with docker-compose (requires infrastructure running):

```bash
make local_infra_up
make local_test_api
```
```

### 4. [apps/workers/README.md](apps/workers/README.md)

Add Docker section after "Available Commands":

```markdown
## Docker

Build Docker image:

```bash
# From monorepo root
make local_build_workers

# Or directly
docker build -f apps/workers/Dockerfile -t podverse-workers:latest .
```

Test with docker-compose (requires infrastructure running):

```bash
make local_infra_up
make local_test_workers
```
```

## Testing

After updating documentation:

1. Verify all links work
2. Test commands from documentation
3. Ensure formatting is consistent with existing docs

## Files Modified

- `docs/QUICKSTART.md` - Add Docker Images section
- `README.md` - Add Docker section
- `apps/api/README.md` - Add Docker section
- `apps/workers/README.md` - Add Docker section
