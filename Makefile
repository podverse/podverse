ifeq ($(UNAME),Darwin)
	SHELL := /opt/local/bin/bash
	OS_X  := true
else ifneq (,$(wildcard /etc/redhat-release))
	RHEL := true
else
	OS_DEB  := true
	SHELL := /bin/bash
endif

# ==========================================
# Common Targets
# ==========================================

.PHONY: say_hello
say_hello:
	@echo "Hello Podverse"

.PHONY: docker_prune_images
docker_prune_images:
	docker image prune -a -f

# ==========================================
# Pre-Push Validation
# ==========================================
# Run all checks that the CI will run before merging to alpha.
# This helps catch issues before pushing.

.PHONY: validate
validate:
	@echo "============================================"
	@echo "  Running Pre-Push Validation"
	@echo "============================================"
	@echo ""
	@echo "Step 1/6: Security audit..."
	npm audit
	@echo ""
	@echo "Step 2/6: Building packages..."
	npm run build:packages
	@echo ""
	@echo "Step 3/6: Linting..."
	npm run lint
	@echo ""
	@echo "Step 4/6: Type checking..."
	npm run type-check
	@echo ""
	@echo "Step 5/6: Setting up env files for web apps..."
	cp apps/web/env/local.env apps/web/.env
	cp apps/management-web/env/local.env apps/management-web/.env
	@echo ""
	@echo "Step 6/6: Building apps..."
	npm run build:apps
	@echo ""
	@echo "============================================"
	@echo "  All checks passed!"
	@echo "============================================"

.PHONY: validate_docker
validate_docker: validate
	@echo ""
	@echo "============================================"
	@echo "  Building Docker Images (Local Test)"
	@echo "============================================"
	@echo ""
	@echo "Building api..."
	docker build -f apps/api/Dockerfile -t podverse-api:test .
	@echo ""
	@echo "Building web..."
	docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/local.env -t podverse-web:test .
	@echo ""
	@echo "Building workers..."
	docker build -f apps/workers/Dockerfile -t podverse-workers:test .
	@echo ""
	@echo "Building management-api..."
	docker build -f apps/management-api/Dockerfile -t podverse-management-api:test .
	@echo ""
	@echo "Building management-web..."
	docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/local.env -t podverse-management-web:test .
	@echo ""
	@echo "============================================"
	@echo "  All Docker images built successfully!"
	@echo "============================================"

# ==========================================
# Include Environment-Specific Makefiles
# ==========================================

-include Makefile.local
include Makefile.alpha
