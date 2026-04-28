# --- Pre-push validation and Docker image build. ---

.PHONY: validate validate_docker db_verify_linear_baseline db_regen_linear_baseline

# Regenerate infra/.../0003_linear_baseline.sql (Docker) and 0004_seed_linear_migration_history.sql (checksums only).
# Run after changes under infra/k8s/base/ops/source/database/linear-migrations/; then commit both files.
db_regen_linear_baseline:
	@bash scripts/database/generate-linear-baseline.sh
	@bash scripts/database/generate-linear-migration-history-seed.sh

# Compare generated DB bootstrap 0003 (Docker) and 0004 checksum seed with committed files.
# See scripts/database/verify-linear-baseline.sh and docs/operations/LINEAR-MIGRATIONS.md
db_verify_linear_baseline:
	@bash scripts/database/verify-linear-baseline.sh

# Run all checks that the CI will run before merging to alpha.
validate:
	@echo "============================================"
	@echo "  Running Pre-Push Validation"
	@echo "============================================"
	@echo ""
	@echo "Step 1/6: Security audit (moderate and above; low permitted)..."
	npm audit --omit=dev --audit-level=moderate
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
	@echo "Step 5/6: Preparing local env files..."
	@$(MAKE) local_env_setup
	@echo ""
	@echo "Step 6/6: Building apps..."
	npm run build:apps
	@echo ""
	@echo "============================================"
	@echo "  All checks passed!"
	@echo "============================================"

validate_docker: validate
	@echo ""
	@echo "============================================"
	@echo "  Building Docker Images (Local Test)"
	@echo "============================================"
	@echo ""
	@echo "Building api..."
	docker build -f apps/api/Dockerfile -t podverse-api:test .
	@echo ""
	@echo "Building web-base and management-web-base..."
	@$(MAKE) local_build_web_base local_build_management_web_base
	@echo ""
	@echo "Building web..."
	docker build -f apps/web/Dockerfile -t podverse-web:test .
	@echo ""
	@echo "Building web runtime config sidecar..."
	docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:test .
	@echo ""
	@echo "Building workers..."
	docker build -f apps/workers/Dockerfile -t podverse-workers:test .
	@echo ""
	@echo "Building management-api..."
	docker build -f apps/management-api/Dockerfile -t podverse-management-api:test .
	@echo ""
	@echo "Building management-web..."
	docker build -f apps/management-web/Dockerfile -t podverse-management-web:test .
	@echo ""
	@echo "Building management-web runtime config sidecar..."
	docker build -f apps/management-web/sidecar/Dockerfile -t podverse-management-web-runtime-config:test .
	@echo ""
	@echo "============================================"
	@echo "  All Docker images built successfully!"
	@echo "============================================"
