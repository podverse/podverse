# Docker Optimization - Makefile Targets

## Overview

Add Makefile targets to [Makefile.local](Makefile.local) for building and testing Docker images using docker-compose.

## Implementation

### 1. Add Docker Image Building Targets

Add to [Makefile.local](Makefile.local) after the infrastructure targets:

```makefile
# ==========================================
# Docker Image Building
# ==========================================

.PHONY: local_build_api
local_build_api:
	docker build -f apps/api/Dockerfile -t podverse-api:latest .

.PHONY: local_build_workers
local_build_workers:
	docker build -f apps/workers/Dockerfile -t podverse-workers:latest .

.PHONY: local_build_management_api
local_build_management_api:
	docker build -f apps/management-api/Dockerfile -t podverse-management-api:latest .

.PHONY: local_build_web
local_build_web:
	docker build -f apps/web/Dockerfile -t podverse-web:latest .

.PHONY: local_build_management_web
local_build_management_web:
	docker build -f apps/management-web/Dockerfile -t podverse-management-web:latest .

.PHONY: local_build_all
local_build_all: local_build_api local_build_workers local_build_management_api local_build_web local_build_management_web
	@echo "All Docker images built successfully"
```

### 2. Add Docker Image Testing Targets

Add after the build targets:

```makefile
# ==========================================
# Docker Image Testing
# ==========================================

.PHONY: local_test_docker_builds
local_test_docker_builds:
	@echo "Building all Docker images..."
	@$(MAKE) local_build_all
	@echo ""
	@echo "Image sizes:"
	@docker images podverse-*:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
	@echo ""
	@echo "Verifying image contents..."
	@docker run --rm podverse-api:latest test -d /opt/packages/helpers/src && echo "ERROR: src found in API image" || echo "✓ API: No src files"
	@docker run --rm podverse-api:latest test -d /opt/packages/helpers/dist && echo "✓ API: dist files present" || echo "ERROR: dist missing in API image"
	@echo ""
	@echo "All Docker builds verified!"

.PHONY: local_test_api
local_test_api: local_build_api
	docker compose -f infra/docker/local/api/docker-compose.yml up -d
	@echo "API started. Check logs with: docker compose -f infra/docker/local/api/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/api/docker-compose.yml down"

.PHONY: local_test_workers
local_test_workers: local_build_workers
	docker compose -f infra/docker/local/workers/docker-compose.yml up -d
	@echo "Workers started. Check logs with: docker compose -f infra/docker/local/workers/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/workers/docker-compose.yml down"

.PHONY: local_test_management_api
local_test_management_api: local_build_management_api
	docker compose -f infra/docker/local/management-api/docker-compose.yml up -d
	@echo "Management API started. Check logs with: docker compose -f infra/docker/local/management-api/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/management-api/docker-compose.yml down"
```

## Testing

After adding the targets, verify:

```bash
# Test building all images
make local_build_all

# Test verification script
make local_test_docker_builds

# Test individual services (requires infrastructure running)
make local_infra_up
make local_test_api
docker compose -f infra/docker/local/api/docker-compose.yml logs -f
docker compose -f infra/docker/local/api/docker-compose.yml down
```

## Files Modified

- `Makefile.local` - Add Docker build and test targets
