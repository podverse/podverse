# --- Alpha Docker: network, db, mq, keyvaldb, workers, api, web, management-*, infra up/down. ---

# Same as local: compose ${DB_APP_*} comes from this file for interpolation, not from service env_file only.
COMPOSE_ALPHA_DB_ENV ?= --env-file infra/config/alpha/db.env

.PHONY: alpha_network_create alpha_network_remove alpha_db_up alpha_db_down alpha_db_reset alpha_db_init
.PHONY: alpha_mq_up alpha_mq_down alpha_keyvaldb_up alpha_keyvaldb_down alpha_workers_pull alpha_workers_down
.PHONY: alpha_api_up alpha_api_down alpha_web_up alpha_web_down alpha_all_down alpha_clean
.PHONY: alpha_infra_up alpha_setup
.PHONY: alpha_management_db_up alpha_management_db_down alpha_management_db_reset alpha_management_db_init
.PHONY: alpha_management_superuser_create alpha_management_superuser_update
.PHONY: alpha_management_api_up alpha_management_api_down alpha_management_web_up alpha_management_web_down

alpha_network_create:
	docker network create podverse_alpha_network

alpha_network_remove:
	docker network rm podverse_alpha_network

alpha_db_up: infra/config/alpha/db.env
	docker compose $(COMPOSE_ALPHA_DB_ENV) -f infra/docker/alpha/db/docker-compose.yml up podverse_alpha_db -d

alpha_db_down:
	docker compose $(COMPOSE_ALPHA_DB_ENV) -f infra/docker/alpha/db/docker-compose.yml down --remove-orphans --rmi all

alpha_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	docker exec -i podverse_alpha_db psql -U "$$DB_APP_OWNER_USER" -d "$${DB_APP_NAME:-podverse_app}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$$DB_APP_OWNER_USER\"; GRANT ALL ON SCHEMA public TO public;"

alpha_db_init: infra/config/alpha/db.env
	@echo "Waiting for database to be ready..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	until docker exec podverse_alpha_db pg_isready -U "$$DB_APP_OWNER_USER" > /dev/null 2>&1; do \
		echo "  Database not ready, waiting..."; \
		sleep 2; \
	done
	@echo "Applying app linear migrations..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	DB_HOST="localhost" DB_PORT="5432" DB_NAME="$${DB_APP_NAME:-podverse_app}" DB_USER="$$DB_APP_OWNER_USER" DB_PASSWORD="$$DB_APP_OWNER_PASSWORD" \
	bash scripts/database/run-linear-migrations.sh --database app
	@echo "Syncing app read roles and grants (bootstrap 0001)..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	bash scripts/database/run-postgres-bootstrap-in-container.sh podverse_alpha_db infra/config/alpha/db.env 1
	@echo "Next step: make alpha_management_db_init"

alpha_mq_up: infra/config/alpha/mq.env
	docker compose -f infra/docker/alpha/mq/docker-compose.yml up podverse_alpha_mq -d
	@./scripts/mq/provision_queues.sh podverse_alpha_mq infra/config/alpha/mq.env

alpha_mq_down:
	docker compose -f infra/docker/alpha/mq/docker-compose.yml down --remove-orphans --rmi all

alpha_keyvaldb_up: infra/config/alpha/keyvaldb.env
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml up podverse_alpha_keyvaldb -d
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml up podverse_alpha_keyvaldb_gui -d

alpha_keyvaldb_down:
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml down --remove-orphans --rmi all

alpha_workers_pull: infra/config/alpha/workers.env
	docker compose -f infra/docker/alpha/workers/docker-compose.yml pull podverse_alpha_workers

alpha_workers_down:
	@if [ -f infra/docker/alpha/workers/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/workers/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping containers directly..."; \
		docker ps -aq --filter "name=podverse_alpha_workers" | xargs -r docker stop 2>/dev/null || true; \
		docker ps -aq --filter "name=podverse_alpha_workers" | xargs -r docker rm 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/workers/*' -q) 2>/dev/null || true; \
	fi

alpha_api_up: infra/config/alpha/api.env
	docker compose -f infra/docker/alpha/api/docker-compose.yml up podverse_alpha_api -d

alpha_api_down:
	@if [ -f infra/docker/alpha/api/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/api/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_api 2>/dev/null || true; \
		docker rm podverse_alpha_api 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/api/*' -q) 2>/dev/null || true; \
	fi

alpha_web_up: infra/config/alpha/web.env infra/config/alpha/web-sidecar.env
	docker compose -f infra/docker/alpha/web/docker-compose.yml up podverse_alpha_web -d

alpha_web_down:
	@if [ -f infra/docker/alpha/web/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/web/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_web 2>/dev/null || true; \
		docker stop podverse_alpha_web_runtime_config 2>/dev/null || true; \
		docker rm podverse_alpha_web 2>/dev/null || true; \
		docker rm podverse_alpha_web_runtime_config 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/web-deploy/*' -q) 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/web-runtime-config/*' -q) 2>/dev/null || true; \
	fi

alpha_all_down:
	-$(MAKE) alpha_keyvaldb_down
	-$(MAKE) alpha_web_down
	-$(MAKE) alpha_api_down
	-$(MAKE) alpha_workers_down
	-$(MAKE) alpha_mq_down
	-$(MAKE) alpha_db_down
	-$(MAKE) alpha_management_web_down
	-$(MAKE) alpha_management_api_down
	-$(MAKE) alpha_management_db_down

alpha_clean:
	docker compose $(COMPOSE_ALPHA_DB_ENV) -f infra/docker/alpha/db/docker-compose.yml down -v --rmi all 2>/dev/null || true
	docker compose -f infra/docker/alpha/mq/docker-compose.yml down -v --rmi all 2>/dev/null || true
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml down -v --rmi all 2>/dev/null || true
	-$(MAKE) alpha_web_down
	-$(MAKE) alpha_api_down
	-$(MAKE) alpha_workers_down
	-$(MAKE) alpha_management_api_down
	-$(MAKE) alpha_management_web_down
	-$(MAKE) alpha_network_remove
	@echo "Alpha environment cleaned."

alpha_infra_up: alpha_db_up alpha_mq_up alpha_keyvaldb_up
	@echo "All alpha infrastructure services started"

alpha_setup: alpha_infra_up alpha_db_init alpha_management_db_init
	@echo ""
	@echo "============================================"
	@echo "Alpha environment ready!"
	@echo "============================================"
	@echo ""
	@echo "To restart services later: make alpha_infra_up"
	@echo ""

alpha_management_db_up: alpha_db_up
	@echo "Management DB is hosted in podverse_alpha_db (single-container mode)."

alpha_management_db_down:
	@echo "Management DB is hosted in podverse_alpha_db; stopping Postgres container."
	@$(MAKE) alpha_db_down

alpha_management_db_reset:
	@echo "Dropping and recreating public schema..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	docker exec -i podverse_alpha_db psql -U "$$DB_MANAGEMENT_OWNER_USER" -d "$${DB_MANAGEMENT_NAME:-podverse_management}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$$DB_MANAGEMENT_OWNER_USER\"; GRANT ALL ON SCHEMA public TO public;"

alpha_management_db_init: infra/config/alpha/db.env
	@echo "Syncing management DB roles and passwords (bootstrap 0002)..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	bash scripts/database/run-postgres-bootstrap-in-container.sh podverse_alpha_db infra/config/alpha/db.env 2
	@echo "Waiting for management database to be ready..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	until docker exec podverse_alpha_db pg_isready -U "$$DB_APP_OWNER_USER" > /dev/null 2>&1; do \
		echo "  Management database not ready, waiting..."; \
		sleep 2; \
	done
	@echo "Applying management linear migrations..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	DB_HOST="localhost" DB_PORT="5432" DB_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" DB_USER="$$DB_MANAGEMENT_OWNER_USER" DB_PASSWORD="$$DB_MANAGEMENT_OWNER_PASSWORD" \
	bash scripts/database/run-linear-migrations.sh --database management
	@echo "Next step: make alpha_management_superuser_create"

alpha_management_superuser_create: infra/config/alpha/db.env
	@echo "Creating alpha management superuser..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	docker run --rm \
	  --network podverse_alpha_network \
	  -v "$$(pwd)/infra/k8s/base/ops/source/database/management-superuser:/opt/scripts/management" \
	  -w /opt/scripts/management \
	  -e DB_HOST="podverse_alpha_db" \
	  -e DB_PORT="5432" \
	  -e DB_MANAGEMENT_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" \
	  -e DB_USER="$$DB_MANAGEMENT_READ_WRITE_USER" \
	  -e DB_PASSWORD="$$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
	  node:24-slim \
	  sh -c "npm install && node create-superuser.mjs $$SUPERUSER_ARGS"
	@echo "Next step: make alpha_management_api_up"

alpha_management_superuser_update: infra/config/alpha/db.env
	@echo "Updating alpha management superuser..."
	@set -a; . infra/config/alpha/db.env; set +a; \
	docker run --rm \
	  --network podverse_alpha_network \
	  -v "$$(pwd)/infra/k8s/base/ops/source/database/management-superuser:/opt/scripts/management" \
	  -w /opt/scripts/management \
	  -e DB_HOST="podverse_alpha_db" \
	  -e DB_PORT="5432" \
	  -e DB_MANAGEMENT_NAME="$${DB_MANAGEMENT_NAME:-podverse_management}" \
	  -e DB_USER="$$DB_MANAGEMENT_READ_WRITE_USER" \
	  -e DB_PASSWORD="$$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
	  node:24-slim \
	  sh -c "npm install && node update-superuser.mjs $$SUPERUSER_ARGS"
	@echo "Next step: make alpha_management_api_up"

alpha_management_api_up: infra/config/alpha/management-api.env
	docker compose -f infra/docker/alpha/management-api/docker-compose.yml up podverse_alpha_management_api -d

alpha_management_api_down:
	@if [ -f infra/docker/alpha/management-api/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/management-api/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_management_api 2>/dev/null || true; \
		docker rm podverse_alpha_management_api 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/management-api/*' -q) 2>/dev/null || true; \
	fi

alpha_management_web_up: infra/config/alpha/management-web.env infra/config/alpha/management-web-sidecar.env
	docker compose -f infra/docker/alpha/management-web/docker-compose.yml up podverse_alpha_management_web -d

alpha_management_web_down:
	@if [ -f infra/docker/alpha/management-web/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/management-web/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_management_web 2>/dev/null || true; \
		docker stop podverse_alpha_management_web_runtime_config 2>/dev/null || true; \
		docker rm podverse_alpha_management_web 2>/dev/null || true; \
		docker rm podverse_alpha_management_web_runtime_config 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/management-web-deploy/*' -q) 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse/management-web-runtime-config/*' -q) 2>/dev/null || true; \
	fi
