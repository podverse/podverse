# --- Local Docker: network, db, mq, keyvaldb, management-db, infra up/down, clean. ---

.PHONY: local_network_create local_network_remove local_db_up local_pgadmin_up local_pgadmin_down
.PHONY: local_db_down local_db_reset local_db_init local_mq_up local_mq_down
.PHONY: local_keyvaldb_up local_keyvaldb_down local_management_db_up local_management_db_down
.PHONY: local_workers_down local_management_db_reset local_management_db_init
.PHONY: local_infra_up local_setup local_all_down local_clean local_prune_podverse_images local_teardown_apps

local_network_create:
	docker network create podverse_local_network 2>/dev/null || true

local_network_remove:
	docker network rm podverse_local_network

local_db_up: local_network_create infra/config/local/db.env
	docker compose -f infra/docker/local/db/docker-compose.yml up podverse_local_db -d

local_pgadmin_up: local_network_create infra/config/local/db.env
	docker compose -f infra/docker/local/pgadmin/docker-compose.yml up -d

local_pgadmin_down:
	docker compose -f infra/docker/local/pgadmin/docker-compose.yml down

local_db_down:
	docker compose -f infra/docker/local/db/docker-compose.yml down --remove-orphans

local_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U postgres -d "$${POSTGRES_DB:-podverse_main}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

local_db_init: infra/config/local/db.env
	@echo "Waiting for database to be ready..."
	@until docker exec podverse_local_db pg_isready -U postgres > /dev/null 2>&1; do \
		echo "  Database not ready, waiting..."; \
		sleep 2; \
	done
	@echo "Initializing main database schema..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U postgres -d "$${POSTGRES_DB:-podverse_main}" -f /opt/database/combined/init_database.sql
	@echo "Creating read/read_write roles and grants (idempotent)..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker compose -f infra/docker/local/db/docker-compose.yml exec podverse_local_db bash -c "POSTGRES_READ_USER=$$POSTGRES_READ_USER POSTGRES_READ_PASSWORD=$$POSTGRES_READ_PASSWORD POSTGRES_READ_WRITE_USER=$$POSTGRES_READ_WRITE_USER POSTGRES_READ_WRITE_PASSWORD=$$POSTGRES_READ_WRITE_PASSWORD POSTGRES_DB=$${POSTGRES_DB:-podverse_main} /opt/database/init-scripts/01-create-users.sh"
	@echo "Seeding local dev account..."
	@set -a; . infra/config/local/db.env; set +a; \
	docker exec -i podverse_local_db psql -U postgres -d "$${POSTGRES_DB:-podverse_main}" -f /opt/database/seed-scripts/local-dev-account.sql
	@echo "Initializing management database..."
	@$(MAKE) local_management_db_init

local_mq_up: local_network_create infra/config/local/mq.env
	docker compose -f infra/docker/local/mq/docker-compose.yml up podverse_local_mq -d
	@./scripts/mq/provision_queues.sh podverse_local_mq infra/config/local/mq.env

local_mq_down:
	docker compose -f infra/docker/local/mq/docker-compose.yml down --remove-orphans

local_keyvaldb_up: local_network_create infra/config/local/keyvaldb.env
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml up podverse_local_keyvaldb -d
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml up podverse_local_keyvaldb_gui -d

local_keyvaldb_down:
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml down --remove-orphans

local_management_db_up: local_network_create infra/config/local/management-db.env
	docker compose -f infra/docker/local/management-db/docker-compose.yml up podverse_local_management_db -d

local_management_db_down:
	docker compose -f infra/docker/local/management-db/docker-compose.yml down --remove-orphans

local_workers_down:
	docker compose -f infra/docker/local/workers/docker-compose.yml down --remove-orphans

local_management_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/local/management-db.env; set +a; \
	docker exec -i podverse_local_management_db psql -U postgres -d "$${POSTGRES_DB:-podverse_management}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

local_management_db_init: infra/config/local/management-db.env
	@echo "Validating required environment variables..."
	@set -a; . infra/config/local/management-db.env; set +a; \
	: "$${SUPERUSER_EMAIL:?Missing SUPERUSER_EMAIL}" \
	: "$${SUPERUSER_PASSWORD:?Missing SUPERUSER_PASSWORD}"
	@echo "Waiting for management database to be ready..."
	@until docker exec podverse_local_management_db pg_isready -U postgres > /dev/null 2>&1; do \
		echo "  Management database not ready, waiting..."; \
		sleep 2; \
	done
	@echo "Initializing management database schema..."
	@set -a; . infra/config/local/management-db.env; set +a; \
	docker exec -i podverse_local_management_db psql -U postgres -d "$${POSTGRES_DB:-podverse_management}" -f /opt/database/management/init_management_database.sql
	@echo "Creating read/read_write roles and grants (idempotent)..."
	@set -a; . infra/config/local/management-db.env; set +a; \
	docker compose -f infra/docker/local/management-db/docker-compose.yml exec podverse_local_management_db bash -c "POSTGRES_MANAGEMENT_DB=$${POSTGRES_MANAGEMENT_DB:-podverse_management} POSTGRES_MANAGEMENT_USER=$$POSTGRES_MANAGEMENT_USER POSTGRES_MANAGEMENT_READ_USER=$$POSTGRES_MANAGEMENT_READ_USER POSTGRES_MANAGEMENT_READ_PASSWORD=$$POSTGRES_MANAGEMENT_READ_PASSWORD POSTGRES_MANAGEMENT_READ_WRITE_USER=$$POSTGRES_MANAGEMENT_READ_WRITE_USER POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD=$$POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD /opt/database/management/init-scripts/01-create-users.sh"
	@echo "Creating superuser account..."
	@set -a; . infra/config/local/management-db.env; set +a; \
	docker run --rm \
	  --network podverse_local_network \
	  -v "$$(pwd)/scripts/management:/opt/scripts/management" \
	  -w /opt/scripts/management \
	  -e SUPERUSER_EMAIL="$$SUPERUSER_EMAIL" \
	  -e SUPERUSER_PASSWORD="$$SUPERUSER_PASSWORD" \
	  -e DB_HOST="podverse_local_management_db" \
	  -e DB_PORT="5432" \
	  -e DB_DATABASE="$${POSTGRES_DB:-podverse_management}" \
	  -e POSTGRES_USER="$${POSTGRES_USER:-postgres}" \
	  -e POSTGRES_PASSWORD="$$POSTGRES_PASSWORD" \
	  node:24-slim \
	  sh -c "npm install && node create-superuser.mjs"

local_infra_up: local_db_up local_pgadmin_up local_mq_up local_keyvaldb_up local_management_db_up
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
	docker compose -f infra/docker/local/db/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/mq/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/keyvaldb/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/management-db/docker-compose.yml down -v 2>/dev/null || true
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

# V4V/Lightning targets (local_ln_up, local_build_boostbox, etc.); run from repo root.
include makefiles/local/Makefile.local.v4v.mk
