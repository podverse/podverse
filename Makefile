ifeq ($(UNAME),Darwin)
	SHELL := /opt/local/bin/bash
	OS_X  := true
else ifneq (,$(wildcard /etc/redhat-release))
	RHEL := true
else
	OS_DEB  := true
	SHELL := /bin/bash
endif

.PHONY: say_hello
say_hello:
	@echo "Hello Podverse"

.PHONY: docker_prune_images
docker_prune_images:
	docker image prune -a -f

# ==========================================
# Alpha Environment
# ==========================================

.PHONY: alpha_validate_init
alpha_validate_init: infra/config/alpha/podverse-alpha-db.env infra/config/alpha/podverse-alpha-mq.env infra/config/alpha/podverse-alpha-workers.env infra/config/alpha/podverse-alpha-api.env infra/config/alpha/podverse-alpha-web.env infra/config/alpha/podverse-alpha-management-db.env infra/config/alpha/podverse-alpha-management-api.env

infra/config/alpha/podverse-alpha-db.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/db.env.example ./$@

infra/config/alpha/podverse-alpha-mq.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/mq.env.example ./$@

infra/config/alpha/podverse-alpha-workers.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/workers.env.example ./$@

infra/config/alpha/podverse-alpha-api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/api.env.example ./$@

infra/config/alpha/podverse-alpha-web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/web.env.example ./$@

infra/config/alpha/podverse-alpha-management-db.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/management-db.env.example ./$@

infra/config/alpha/podverse-alpha-management-api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/management-api.env.example ./$@

# Database
.PHONY: alpha_db_up
alpha_db_up: infra/config/alpha/podverse-alpha-db.env
	docker compose -f infra/docker/alpha/db/docker-compose.yml up podverse_alpha_db -d

.PHONY: alpha_db_down
alpha_db_down:
	docker compose -f infra/docker/alpha/db/docker-compose.yml down --remove-orphans --rmi all

.PHONY: alpha_db_reset
alpha_db_reset:
	@echo "Dropping and recreating public schema..."
	docker exec -i podverse_alpha_db psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

.PHONY: alpha_db_init
alpha_db_init: infra/config/alpha/podverse-alpha-db.env
	@echo "Creating read/read_write roles (idempotent)..."
	@set -a; . infra/config/alpha/podverse-alpha-db.env; set +a; \
	docker compose -f infra/docker/alpha/db/docker-compose.yml exec podverse_alpha_db bash -c "POSTGRES_READ_PASSWORD=$$POSTGRES_READ_PASSWORD POSTGRES_READ_WRITE_PASSWORD=$$POSTGRES_READ_WRITE_PASSWORD /opt/database/init-scripts/01-create-users.sh"
	docker exec -i podverse_alpha_db psql -U postgres -d postgres -f /opt/database/combined/init_database.sql

# Message Queue
.PHONY: alpha_mq_up
alpha_mq_up: infra/config/alpha/podverse-alpha-mq.env
	docker compose -f infra/docker/alpha/mq/docker-compose.yml up podverse_alpha_mq -d
	@./scripts/mq/provision_queues.sh podverse_alpha_mq infra/config/alpha/podverse-alpha-mq.env

.PHONY: alpha_mq_down
alpha_mq_down:
	docker compose -f infra/docker/alpha/mq/docker-compose.yml down --remove-orphans --rmi all

# Workers
.PHONY: alpha_workers_pull
alpha_workers_pull: infra/config/alpha/podverse-alpha-workers.env
	docker compose -f infra/docker/alpha/workers/docker-compose.yml pull podverse_alpha_workers

.PHONY: alpha_workers_down
alpha_workers_down:
	@if [ -f infra/docker/alpha/workers/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/workers/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping containers directly..."; \
		docker ps -aq --filter "name=podverse_alpha_workers" | xargs -r docker stop 2>/dev/null || true; \
		docker ps -aq --filter "name=podverse_alpha_workers" | xargs -r docker rm 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse-workers/*' -q) 2>/dev/null || true; \
	fi

# API
.PHONY: alpha_api_up
alpha_api_up: infra/config/alpha/podverse-alpha-api.env
	docker compose -f infra/docker/alpha/api/docker-compose.yml up podverse_alpha_api -d

.PHONY: alpha_api_down
alpha_api_down:
	@if [ -f infra/docker/alpha/api/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/api/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_api 2>/dev/null || true; \
		docker rm podverse_alpha_api 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse-api/*' -q) 2>/dev/null || true; \
	fi

# Web
.PHONY: alpha_web_up
alpha_web_up: infra/config/alpha/podverse-alpha-web.env
	docker compose -f infra/docker/alpha/web/docker-compose.yml up podverse_alpha_web -d

.PHONY: alpha_web_down
alpha_web_down:
	@if [ -f infra/docker/alpha/web/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/web/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_web 2>/dev/null || true; \
		docker rm podverse_alpha_web 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse-web/*' -q) 2>/dev/null || true; \
	fi

# Key-Value Database
.PHONY: alpha_keyvaldb_up
alpha_keyvaldb_up: infra/config/alpha/podverse-alpha-keyvaldb.env
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml up podverse_alpha_keyvaldb -d
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml up podverse_alpha_keyvaldb_gui -d

.PHONY: alpha_keyvaldb_down
alpha_keyvaldb_down:
	docker compose -f infra/docker/alpha/keyvaldb/docker-compose.yml down --remove-orphans --rmi all

# Stop all alpha services
.PHONY: alpha_all_down
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

# ==========================================
# Management System (Alpha)
# ==========================================

# Management Database
.PHONY: alpha_management_db_up
alpha_management_db_up: infra/config/alpha/podverse-alpha-management-db.env
	docker compose -f infra/docker/alpha/management-db/docker-compose.yml up podverse_alpha_management_db -d

.PHONY: alpha_management_db_down
alpha_management_db_down:
	docker compose -f infra/docker/alpha/management-db/docker-compose.yml down --remove-orphans --rmi all

.PHONY: alpha_management_db_reset
alpha_management_db_reset:
	@echo "Dropping and recreating public schema..."
	docker exec -i podverse_alpha_management_db psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

.PHONY: alpha_management_db_init
alpha_management_db_init: infra/config/alpha/podverse-alpha-management-db.env
	@echo "Validating required environment variables..."
	@set -a; . infra/config/alpha/podverse-alpha-management-db.env; set +a; \
	: "$${SUPERUSER_EMAIL:?Missing SUPERUSER_EMAIL}" \
	: "$${SUPERUSER_PASSWORD:?Missing SUPERUSER_PASSWORD}"
	@echo "Creating read/read_write roles (idempotent)..."
	@set -a; . infra/config/alpha/podverse-alpha-management-db.env; set +a; \
	docker compose -f infra/docker/alpha/management-db/docker-compose.yml exec podverse_alpha_management_db bash -c "POSTGRES_READ_PASSWORD=$$POSTGRES_READ_PASSWORD POSTGRES_READ_WRITE_PASSWORD=$$POSTGRES_READ_WRITE_PASSWORD /opt/database/management/init-scripts/01-create-users.sh"
	docker exec -i podverse_alpha_management_db psql -U postgres -d postgres -f /opt/database/management/init_management_database.sql
	@echo "Creating superuser account..."
	@set -a; . infra/config/alpha/podverse-alpha-management-db.env; set +a; \
	./scripts/management/create-superuser.sh

# Management API
.PHONY: alpha_management_api_up
alpha_management_api_up: infra/config/alpha/podverse-alpha-management-api.env
	docker compose -f infra/docker/alpha/management-api/docker-compose.yml up podverse_alpha_management_api -d

.PHONY: alpha_management_api_down
alpha_management_api_down:
	@if [ -f infra/docker/alpha/management-api/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/management-api/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_management_api 2>/dev/null || true; \
		docker rm podverse_alpha_management_api 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse-management-api/*' -q) 2>/dev/null || true; \
	fi

# Management Web
.PHONY: alpha_management_web_up
alpha_management_web_up:
	docker compose -f infra/docker/alpha/management-web/docker-compose.yml up podverse_alpha_management_web -d

.PHONY: alpha_management_web_down
alpha_management_web_down:
	@if [ -f infra/docker/alpha/management-web/docker-compose.yml ]; then \
		docker compose -f infra/docker/alpha/management-web/docker-compose.yml down --remove-orphans --rmi all; \
	else \
		echo "docker-compose.yml not found, stopping container directly..."; \
		docker stop podverse_alpha_management_web 2>/dev/null || true; \
		docker rm podverse_alpha_management_web 2>/dev/null || true; \
		docker rmi $$(docker images --filter=reference='ghcr.io/podverse/podverse-management-web/*' -q) 2>/dev/null || true; \
	fi

# ==========================================
# Docker Network
# ==========================================

.PHONY: alpha_network_create
alpha_network_create:
	docker network create podverse_alpha_network

.PHONY: alpha_network_remove
alpha_network_remove:
	docker network rm podverse_alpha_network
