# --- Local Docker: network, db (main + management), mq, keyvaldb, infra up/down, clean. ---

# Compose interpolation: postgres.environment and healthcheck use ${DB_APP_*};
# the service env_file does not supply the compose parser — pass the same file here (see Metaboost COMPOSE_LOCAL_ENV).
COMPOSE_LOCAL_DB_ENV ?= --env-file infra/config/local/db.env

.PHONY: local_network_create local_network_remove local_db_up local_pgadmin_up local_pgadmin_down
.PHONY: local_db_down local_db_reset local_db_init local_mq_up local_mq_down
.PHONY: local_keyvaldb_up local_keyvaldb_down local_management_db_up local_management_db_down
.PHONY: local_workers_down local_management_db_reset local_management_db_init
.PHONY: local_management_superuser_create local_management_superuser_update
.PHONY: local_management_superuser_create_k8s local_management_superuser_update_k8s
.PHONY: local_infra_up local_setup local_all_down local_clean local_prune_podverse_images local_teardown_apps

local_network_create:
	docker network create podverse_local_network 2>/dev/null || true

local_network_remove:
	docker network rm podverse_local_network

local_db_up: local_network_create infra/config/local/db.env
	docker compose $(COMPOSE_LOCAL_DB_ENV) -f infra/docker/local/db/docker-compose.yml up podverse_local_db -d

local_pgadmin_up: local_network_create infra/config/local/db.env
	docker compose -f infra/docker/local/pgadmin/docker-compose.yml up -d

local_pgadmin_down:
	docker compose -f infra/docker/local/pgadmin/docker-compose.yml down

local_db_down:
	docker compose $(COMPOSE_LOCAL_DB_ENV) -f infra/docker/local/db/docker-compose.yml down --remove-orphans

local_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U "$$DB_APP_ADMIN_USER" -d "$${DB_APP_NAME:-podverse_app}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$$DB_APP_ADMIN_USER\"; GRANT ALL ON SCHEMA public TO public;"

local_db_init: infra/config/local/db.env
	@echo "Waiting for database to be ready..."
	@set -a; . infra/config/local/db.env; set +a; \
	for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
		if docker exec podverse_local_db pg_isready -U "$$DB_APP_ADMIN_USER" > /dev/null 2>&1; then break; fi; \
		echo "  Database not ready, waiting... ($$i/30)"; \
		if [ "$$i" -eq 30 ]; then echo "Database did not become ready in time."; exit 1; fi; \
		sleep 2; \
	done
	@echo "Applying app linear migrations..."
	@set -a; . infra/config/local/db.env; set +a; \
	DB_HOST="localhost" DB_PORT="5432" DB_NAME="$${DB_APP_NAME:-podverse_app}" DB_USER="$$DB_APP_ADMIN_USER" DB_PASSWORD="$$DB_APP_ADMIN_PASSWORD" \
	bash scripts/database/run-linear-migrations.sh --database app
	@echo "Syncing app read roles and grants (bootstrap 0001)..."
	@set -a; . infra/config/local/db.env; set +a; \
	bash scripts/database/run-postgres-bootstrap-in-container.sh podverse_local_db infra/config/local/db.env 1
	@echo "Seeding local dev account..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U "$$DB_APP_ADMIN_USER" -d "$${DB_APP_NAME:-podverse_app}" -f /opt/database/seed-scripts/local-dev-account.sql
	@echo "Applying management linear migrations..."
	@$(MAKE) local_management_db_init
	@echo "Next step: make local_management_superuser_create"

local_mq_up: local_network_create infra/config/local/mq.env
	docker compose -f infra/docker/local/mq/docker-compose.yml up podverse_local_mq -d
	@./scripts/mq/provision_queues.sh podverse_local_mq infra/config/local/mq.env

local_mq_down:
	docker compose -f infra/docker/local/mq/docker-compose.yml down --remove-orphans

local_keyvaldb_up: local_network_create infra/config/local/keyvaldb.env
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml up -d

local_keyvaldb_down:
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml down --remove-orphans

local_management_db_up: local_db_up
	@echo "Management DB is hosted in podverse_local_db (single-container mode)."

local_management_db_down:
	@echo "Management DB is hosted in podverse_local_db; stopping Postgres container."
	@$(MAKE) local_db_down

local_workers_down:
	docker compose -f infra/docker/local/workers/docker-compose.yml down --remove-orphans

local_management_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U "$$DB_MANAGEMENT_ADMIN_USER" -d "$${DB_MANAGEMENT_NAME:-podverse_management}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$$DB_MANAGEMENT_ADMIN_USER\"; GRANT ALL ON SCHEMA public TO public;"

local_management_db_init: infra/config/local/db.env
	@echo "Syncing management DB roles and passwords (bootstrap 0002)..."
	@set -a; . infra/config/local/db.env; set +a; \
	bash scripts/database/run-postgres-bootstrap-in-container.sh podverse_local_db infra/config/local/db.env 2
	@echo "Waiting for management database to be ready..."
	@set -a; . infra/config/local/db.env; set +a; \
	for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
		if docker exec podverse_local_db pg_isready -U "$$DB_APP_ADMIN_USER" > /dev/null 2>&1; then break; fi; \
		echo "  Management database not ready, waiting... ($$i/30)"; \
		if [ "$$i" -eq 30 ]; then echo "Management database did not become ready in time."; exit 1; fi; \
		sleep 2; \
	done
	@echo "Applying management linear migrations..."
	@set -a; . infra/config/local/db.env; set +a; \
	DB_HOST="localhost" DB_PORT="5432" DB_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" DB_USER="$$DB_MANAGEMENT_ADMIN_USER" DB_PASSWORD="$$DB_MANAGEMENT_ADMIN_PASSWORD" \
	bash scripts/database/run-linear-migrations.sh --database management
	@echo "Next step: make local_management_superuser_create"

local_management_superuser_create: infra/config/local/db.env
	@echo "Creating management superuser..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker run --rm \
	  --network podverse_local_network \
	  -v "$$(pwd)/infra/k8s/base/ops/source/database/management-superuser:/opt/scripts/management" \
	  -w /opt/scripts/management \
	  -e DB_HOST="podverse_local_db" \
	  -e DB_PORT="5432" \
	  -e DB_MANAGEMENT_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" \
	  -e DB_USER="$$DB_MANAGEMENT_READ_WRITE_USER" \
	  -e DB_PASSWORD="$$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
	  node:24-slim \
	  sh -c "npm install && node create-superuser.mjs $$SUPERUSER_ARGS"
	@echo "Next step: make local_start_all_apps"

local_management_superuser_update: infra/config/local/db.env
	@echo "Updating management superuser..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker run --rm \
	  --network podverse_local_network \
	  -v "$$(pwd)/infra/k8s/base/ops/source/database/management-superuser:/opt/scripts/management" \
	  -w /opt/scripts/management \
	  -e DB_HOST="podverse_local_db" \
	  -e DB_PORT="5432" \
	  -e DB_MANAGEMENT_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" \
	  -e DB_USER="$$DB_MANAGEMENT_READ_WRITE_USER" \
	  -e DB_PASSWORD="$$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
	  node:24-slim \
	  sh -c "npm install && node update-superuser.mjs $$SUPERUSER_ARGS"
	@echo "Next step: make local_start_all_apps"

local_management_superuser_create_k8s:
	@K8S_NAMESPACE="$${K8S_NAMESPACE:-podverse-local}" npm run management:superuser:create:k8s
	@echo "Next step: watch job logs with kubectl -n $$K8S_NAMESPACE logs -f job/<name>"

local_management_superuser_update_k8s:
	@K8S_NAMESPACE="$${K8S_NAMESPACE:-podverse-local}" npm run management:superuser:update:k8s
	@echo "Next step: watch job logs with kubectl -n $$K8S_NAMESPACE logs -f job/<name>"

local_infra_up: local_db_up local_pgadmin_up local_mq_up local_keyvaldb_up
	@echo "All local infrastructure services started"
	@echo "To create read/read_write DB users (required before first use): make local_db_init"

local_setup: local_env_setup local_infra_up local_db_init
	@echo ""
	@echo "============================================"
	@echo "Local environment ready!"
	@echo "============================================"
	@echo ""
	@echo "Next steps:"
	@echo "  1. npm run build:packages"
	@echo "  2. npm run dev:main:all (or dev:all for everything)"
	@echo ""
	@echo "To restart services later: make local_infra_up"
	@echo ""

local_all_down:
	-$(MAKE) local_stop_all_apps
	-$(MAKE) local_workers_down
	-$(MAKE) local_pgadmin_down
	-$(MAKE) local_keyvaldb_down
	-$(MAKE) local_mq_down
	-$(MAKE) local_db_down
	-$(MAKE) local_management_db_down

local_clean:
	-$(MAKE) local_stop_all_apps
	-$(MAKE) local_pgadmin_down
	-$(MAKE) local_ln_down
	docker compose $(COMPOSE_LOCAL_DB_ENV) -f infra/docker/local/db/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/mq/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml down -v 2>/dev/null || true
	-$(MAKE) local_workers_down
	-$(MAKE) local_network_remove
	@echo "Local environment cleaned. Images preserved for faster restart."

local_prune_podverse_images:
	@echo "Removing Podverse-specific images..."
	docker images --filter=reference='*podverse*' -q | xargs -r docker rmi 2>/dev/null || true
	docker images --filter=reference='ghcr.io/podverse/*' -q | xargs -r docker rmi 2>/dev/null || true
	@echo "Clearing Docker build cache..."
	docker builder prune -f 2>/dev/null || true
	@echo "Done. External images (postgres, valkey, artemis) preserved."

local_teardown_apps:
	$(MAKE) local_stop_all_apps
	$(MAKE) local_prune_podverse_images

# V4V/Lightning targets (local_ln_up, etc.); run from repo root.
include makefiles/local/Makefile.local.v4v.mk
