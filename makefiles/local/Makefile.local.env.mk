# --- Local env setup and copy rules. ---

.PHONY: local_env_prepare local_env_link local_env_setup local_env_clean
.PHONY: local_env_sync_db_passwords local_env_worktree_setup local_db_sync_passwords
.PHONY: local_env_export_secrets_to_home local_seed_embed local_seed_embed_demo_feeds
.PHONY: local_seed_embed_demo_feeds_k8s

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
		infra/config/local/api.env \
		infra/config/local/workers.env \
		infra/config/local/management-api.env \
		infra/config/local/web.env \
		infra/config/local/web-sidecar.env \
		infra/config/local/management-web.env \
		infra/config/local/management-web-sidecar.env \
		infra/config/local/extensions.env \
		infra/config/local/extension-sidecar-otel.env \
		infra/config/local/extension-prometheus.env \
		apps/api/.env \
		apps/workers/.env \
		apps/management-api/.env \
		apps/mobile/.env \
		apps/web/.env.local \
		apps/web/sidecar/.env \
		apps/management-web/.env.local \
		apps/management-web/sidecar/.env
	@echo "Local env files removed. Run make local_env_setup to regenerate."

local_env_prepare:
	bash scripts/local-env/prepare-overrides.sh

# Non-destructive local env setup:
# - Create missing runtime env files from templates/examples
# - Web/management-web: apps/*/sidecar/.env.example → sidecar .env + infra *-sidecar.env;
#   setup.sh writes .env.local (RUNTIME_CONFIG_URL + OTEL_/PROMETHEUS_ from sidecar catalog)
# - Generate passwords/keys when empty
# - Apply manual overrides from dev/env-overrides/local/*.env
local_env_setup: infra/config/local/db.env infra/config/local/mq.env infra/config/local/keyvaldb.env infra/config/local/api.env infra/config/local/workers.env infra/config/local/management-api.env infra/config/local/web.env infra/config/local/web-sidecar.env infra/config/local/management-web.env infra/config/local/management-web-sidecar.env infra/config/local/extensions.env infra/config/local/extension-sidecar-otel.env infra/config/local/extension-prometheus.env apps/api/.env apps/workers/.env apps/management-api/.env apps/mobile/.env apps/web/.env.local apps/web/sidecar/.env apps/management-web/.env.local apps/management-web/sidecar/.env
	bash scripts/local-env/setup.sh
	@echo "Local env setup complete."

# Sync Postgres role passwords when the shared local container is already running (no migrations).
local_db_sync_passwords: infra/config/local/db.env
	@if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx podverse_local_db; then \
		echo "Postgres container podverse_local_db is not running; skipping password sync."; \
		echo "Start infra (make local_infra_up) then run: make local_db_sync_passwords"; \
		exit 0; \
	fi
	@echo "Syncing Postgres role passwords from infra/config/local/db.env..."
	@bash scripts/database/run-postgres-bootstrap-in-container.sh podverse_local_db infra/config/local/db.env all
	@echo "DB role passwords synced."

local_env_sync_db_passwords: local_db_sync_passwords

# Recommended for new git work trees: link home overrides, generate repo env from persisted secrets, sync DB if running.
local_env_worktree_setup: local_env_link local_env_setup local_env_sync_db_passwords
	@echo "Work tree env ready (home secrets applied; DB passwords synced when Postgres was running)."

# One-time: copy this checkout's infra secrets into ~/.config (use from primary checkout that owns Postgres).
local_env_export_secrets_to_home:
	bash scripts/local-env/export-local-secrets-to-home.sh

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

infra/config/local/management-api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/management-api/.env.example ./$@

infra/config/local/web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/web.env.example ./$@

infra/config/local/web-sidecar.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/web/sidecar/.env.example ./$@

infra/config/local/management-web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/management-web/.env.example ./$@

infra/config/local/management-web-sidecar.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./apps/management-web/sidecar/.env.example ./$@

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

apps/mobile/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/mobile/.env.example ./$@

apps/web/.env.local:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/web/.env.example ./$@

apps/web/sidecar/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p apps/web/sidecar
	cp ./apps/web/sidecar/.env.example ./$@

apps/management-web/.env.local:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./apps/management-web/.env.example ./$@

apps/management-web/sidecar/.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p apps/management-web/sidecar
	cp ./apps/management-web/sidecar/.env.example ./$@

infra/config/local/extensions.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/extensions.env.example ./$@

infra/config/local/extension-sidecar-otel.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/extension-sidecar-otel.env.example ./$@

infra/config/local/extension-prometheus.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	mkdir -p infra/config/local
	cp ./infra/config/env-templates/extension-prometheus.env.example ./$@

# Seed deterministic media-player + embed fixtures into the local dev app DB (does not truncate accounts).
local_seed_embed: infra/config/local/db.env
	@echo "Seeding local embed + media-player fixtures..."
	@node tools/web/seed-local-embed.mjs
	@echo "Local embed seed complete."

# Parse Podcast Index showcase feeds and upsert embed_demo_showcase rows (always re-parses).
local_seed_embed_demo_feeds: infra/config/local/db.env
	@echo "Seeding embed demo showcase from Podcast Index feeds..."
	@npm run seed_embed_demo_showcase_feeds -w apps/workers
	@echo "Embed demo showcase feed seed complete."

# K8s counterpart to local_seed_embed_demo_feeds (suspended ops CronJob seed-embed-demo-showcase-feeds).
local_seed_embed_demo_feeds_k8s:
	@K8S_NAMESPACE="$${K8S_NAMESPACE:-podverse-alpha}" npm run seed:embed-demo-showcase-feeds:k8s
	@echo "Next step: kubectl -n $${K8S_NAMESPACE:-podverse-alpha} logs -f job/<name-from-script-output>"
