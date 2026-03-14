# --- Local env setup and copy rules. ---

.PHONY: local_env_prepare local_env_link local_env_setup local_env_clean

local_env_link:
	bash scripts/local-env/link-overrides.sh

local_env_clean:
	@running=$$(docker ps -q --filter "name=podverse_local_" 2>/dev/null); \
	if [ -n "$$running" ]; then \
		echo "ERROR: local_env_clean cannot run while Podverse local containers are running."; \
		echo "Stop them first with: make local_all_down"; \
		docker ps --filter "name=podverse_local_" --format "  {{.Names}}"; \
		exit 1; \
	fi
	@echo "Removing local env files (keeping dev/env-overrides/local/*.env)..."
	@rm -f \
		infra/config/local/db.env \
		infra/config/local/mq.env \
		infra/config/local/keyvaldb.env \
		infra/config/local/management-db.env \
		infra/config/local/api.env \
		infra/config/local/workers.env \
		infra/config/local/management-api.env \
		infra/config/local/web.env \
		infra/config/local/management-web.env \
		apps/api/.env \
		apps/workers/.env \
		apps/management-api/.env \
		apps/web/.env.local \
		apps/management-web/.env.local
	@echo "Local env files removed. Run make local_env_setup to regenerate."

local_env_prepare:
	bash scripts/local-env/prepare-overrides.sh

# Non-destructive local env setup:
# - Create missing runtime env files from templates/examples
# - Generate passwords/keys when empty
# - Apply manual overrides from dev/env-overrides/local/*.env
local_env_setup: infra/config/local/db.env infra/config/local/mq.env infra/config/local/keyvaldb.env infra/config/local/management-db.env infra/config/local/api.env infra/config/local/workers.env infra/config/local/management-api.env infra/config/local/web.env infra/config/local/management-web.env apps/api/.env apps/workers/.env apps/management-api/.env apps/web/.env.local apps/management-web/.env.local
	bash scripts/local-env/setup.sh
	@echo "Local env setup complete."

# Auto-copy missing local env files from templates/examples
infra/config/local/db.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/db.env.example ./$@

infra/config/local/mq.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/mq.env.example ./$@

infra/config/local/keyvaldb.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/keyvaldb.env.example ./$@

infra/config/local/api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/api/.env.example ./$@

infra/config/local/workers.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/workers/.env.example ./$@

infra/config/local/management-db.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/management-db.env.example ./$@

infra/config/local/management-api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/management-api/.env.example ./$@

infra/config/local/web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/web/.env.example ./$@

infra/config/local/management-web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/management-web/.env.example ./$@

apps/api/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/api/.env.example ./$@

apps/workers/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/workers/.env.example ./$@

apps/management-api/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/management-api/.env.example ./$@

apps/web/.env.local:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/web/.env.example ./$@

apps/management-web/.env.local:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/management-web/.env.example ./$@
