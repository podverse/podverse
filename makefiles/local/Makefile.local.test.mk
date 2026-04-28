# --- Test requirements (local). Default host ports 5732 (Postgres) and 6679 (Valkey).
#     Metaboost test stack uses 5632/6579; Podverse dev uses 5432/6379. No overlaps.
#     Schema bootstrapped by forward-only linear migrations. ---

.PHONY: test_deps test_postgres_up test_valkey_up test_db_init test_db_init_management test_db_list help_test test_clean

# Default test ports (must match apps/api/src/test/setup.ts and apps/management-api/vitest.setup.ts defaults)
TEST_DB_PORT ?= 5732
TEST_VALKEY_PORT ?= 6679
TEST_PG_USER ?= postgres
TEST_PG_PASSWORD ?= postgres
TEST_DB_NAME ?= podverse_app_test
TEST_MANAGEMENT_DB_NAME ?= podverse_management_test

TEST_PG_CONTAINER := podverse_test_postgres
TEST_VALKEY_CONTAINER := podverse_test_valkey

# Test DB user names match local dev naming convention
TEST_APP_READ_USER ?= podverse_app_read
TEST_APP_READ_PASSWORD ?= test
TEST_APP_READ_WRITE_USER ?= podverse_app_read_write
TEST_APP_READ_WRITE_PASSWORD ?= test
TEST_MGMT_READ_USER ?= podverse_management_read
TEST_MGMT_READ_PASSWORD ?= test
TEST_MGMT_READ_WRITE_USER ?= podverse_management_read_write
TEST_MGMT_READ_WRITE_PASSWORD ?= test

# Ensure test Postgres and Valkey are running and both test databases exist.
test_deps: test_postgres_up test_valkey_up test_db_init test_db_init_management
	@echo "Test dependencies ready: $(TEST_DB_NAME), $(TEST_MANAGEMENT_DB_NAME), Valkey on $(TEST_VALKEY_PORT)."

# List test databases inside the running Postgres container.
test_db_list: test_postgres_up
	@echo "Databases in $(TEST_PG_CONTAINER):"
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "SELECT datname FROM pg_database WHERE datname IN ('$(TEST_DB_NAME)', '$(TEST_MANAGEMENT_DB_NAME)') ORDER BY datname;"

# Start Postgres on port $(TEST_DB_PORT) for tests (idempotent).
test_postgres_up:
	@if docker ps -q -f name=^/$(TEST_PG_CONTAINER)$$ | grep -q .; then \
		echo "Test Postgres already running ($(TEST_PG_CONTAINER))."; \
	elif docker ps -aq -f name=^/$(TEST_PG_CONTAINER)$$ | grep -q .; then \
		echo "Starting existing test Postgres container..."; \
		docker start $(TEST_PG_CONTAINER); \
		echo "Waiting for Postgres to be ready..."; \
		for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
			if docker exec $(TEST_PG_CONTAINER) pg_isready -U $(TEST_PG_USER) >/dev/null 2>&1; then break; fi; \
			sleep 1; \
			if [ $$i -eq 20 ]; then echo "Postgres did not become ready (run: docker logs $(TEST_PG_CONTAINER))."; exit 1; fi; \
		done; \
		echo "Test Postgres ready on port $(TEST_DB_PORT)."; \
	else \
		echo "Starting test Postgres on port $(TEST_DB_PORT)..."; \
		docker run -d --name $(TEST_PG_CONTAINER) \
			-p 127.0.0.1:$(TEST_DB_PORT):5432 \
			-e POSTGRES_USER=$(TEST_PG_USER) \
			-e POSTGRES_PASSWORD=$(TEST_PG_PASSWORD) \
			postgres:18.3 \
		|| (echo "If bind failed: Podverse dev uses 5432; test uses $(TEST_DB_PORT). Metaboost test uses 5632. Check docker ps and free the port or set TEST_DB_PORT."; exit 1); \
		echo "Waiting for Postgres to be ready..."; \
		for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do \
			if docker exec $(TEST_PG_CONTAINER) pg_isready -U $(TEST_PG_USER) >/dev/null 2>&1; then break; fi; \
			sleep 1; \
			if [ $$i -eq 20 ]; then echo "Postgres did not become ready (run: docker logs $(TEST_PG_CONTAINER))."; exit 1; fi; \
		done; \
		echo "Test Postgres ready on port $(TEST_DB_PORT)."; \
	fi

# Start Valkey on port $(TEST_VALKEY_PORT) for tests (idempotent).
test_valkey_up:
	@if docker ps -q -f name=^/$(TEST_VALKEY_CONTAINER)$$ | grep -q .; then \
		echo "Test Valkey already running ($(TEST_VALKEY_CONTAINER))."; \
	elif docker ps -aq -f name=^/$(TEST_VALKEY_CONTAINER)$$ | grep -q .; then \
		echo "Starting existing test Valkey container..."; \
		docker start $(TEST_VALKEY_CONTAINER); \
		echo "Waiting for Valkey to be ready..."; \
		for i in 1 2 3 4 5; do \
			if (echo "PING" | nc -w 1 127.0.0.1 $(TEST_VALKEY_PORT) | grep -q PONG) 2>/dev/null || true; then break; fi; \
			sleep 1; \
		done; \
		echo "Test Valkey ready on port $(TEST_VALKEY_PORT)."; \
	else \
		echo "Starting test Valkey on port $(TEST_VALKEY_PORT)..."; \
		docker run -d --name $(TEST_VALKEY_CONTAINER) \
			-p 127.0.0.1:$(TEST_VALKEY_PORT):6379 \
			valkey/valkey:9.0.1 \
		|| (echo "If bind failed: Podverse dev uses 6379; test uses $(TEST_VALKEY_PORT). Metaboost test uses 6579. Check docker ps and free the port or set TEST_VALKEY_PORT."; exit 1); \
		echo "Waiting for Valkey to be ready..."; \
		for i in 1 2 3 4 5; do \
			if (echo "PING" | nc -w 1 127.0.0.1 $(TEST_VALKEY_PORT) | grep -q PONG) 2>/dev/null || true; then break; fi; \
			sleep 1; \
		done; \
		echo "Test Valkey ready on port $(TEST_VALKEY_PORT)."; \
	fi

# Create test database, apply linear migrations, create DB users and grants.
# Drops and recreates the test DB each run so schema stays in sync with migrations.
# Forward-only migrations are validated/applied via scripts/database/run-linear-migrations.sh.
test_db_init: test_postgres_up
	@echo "Creating test database and users..."
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(TEST_DB_NAME)' AND pid <> pg_backend_pid();" 2>/dev/null || true
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "DROP DATABASE IF EXISTS $(TEST_DB_NAME);"
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "CREATE DATABASE $(TEST_DB_NAME);"
	@DB_HOST="127.0.0.1" DB_PORT="$(TEST_DB_PORT)" DB_USER="$(TEST_PG_USER)" DB_PASSWORD="$(TEST_PG_PASSWORD)" DB_NAME="$(TEST_DB_NAME)" \
	bash scripts/database/run-linear-migrations.sh --database app
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "DO \$$$$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$(TEST_APP_READ_USER)') THEN CREATE USER $(TEST_APP_READ_USER) WITH PASSWORD '$(TEST_APP_READ_PASSWORD)'; END IF; IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$(TEST_APP_READ_WRITE_USER)') THEN CREATE USER $(TEST_APP_READ_WRITE_USER) WITH PASSWORD '$(TEST_APP_READ_WRITE_PASSWORD)'; END IF; END \$$$$;"
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d $(TEST_DB_NAME) -c " \
		GRANT CONNECT ON DATABASE $(TEST_DB_NAME) TO $(TEST_APP_READ_USER), $(TEST_APP_READ_WRITE_USER); \
		GRANT USAGE ON SCHEMA public TO $(TEST_APP_READ_USER), $(TEST_APP_READ_WRITE_USER); \
		GRANT SELECT ON ALL TABLES IN SCHEMA public TO $(TEST_APP_READ_USER); \
		GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO $(TEST_APP_READ_USER); \
		GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO $(TEST_APP_READ_WRITE_USER); \
		GRANT SELECT, USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $(TEST_APP_READ_WRITE_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO $(TEST_APP_READ_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO $(TEST_APP_READ_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO $(TEST_APP_READ_WRITE_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, USAGE, UPDATE ON SEQUENCES TO $(TEST_APP_READ_WRITE_USER);"
	@echo "Test database $(TEST_DB_NAME) and users ready."

# Create management test database and apply management linear migrations.
test_db_init_management: test_db_init
	@echo "Creating management test database..."
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$(TEST_MANAGEMENT_DB_NAME)' AND pid <> pg_backend_pid();" 2>/dev/null || true
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "DROP DATABASE IF EXISTS $(TEST_MANAGEMENT_DB_NAME);"
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "CREATE DATABASE $(TEST_MANAGEMENT_DB_NAME);"
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d postgres -c "DO \$$$$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$(TEST_MGMT_READ_USER)') THEN CREATE USER $(TEST_MGMT_READ_USER) WITH PASSWORD '$(TEST_MGMT_READ_PASSWORD)'; END IF; IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$(TEST_MGMT_READ_WRITE_USER)') THEN CREATE USER $(TEST_MGMT_READ_WRITE_USER) WITH PASSWORD '$(TEST_MGMT_READ_WRITE_PASSWORD)'; END IF; END \$$$$;"
	@DB_HOST="127.0.0.1" DB_PORT="$(TEST_DB_PORT)" DB_USER="$(TEST_PG_USER)" DB_PASSWORD="$(TEST_PG_PASSWORD)" DB_NAME="$(TEST_MANAGEMENT_DB_NAME)" \
	bash scripts/database/run-linear-migrations.sh --database management
	@docker exec $(TEST_PG_CONTAINER) psql -U $(TEST_PG_USER) -d $(TEST_MANAGEMENT_DB_NAME) -c " \
		GRANT CONNECT ON DATABASE $(TEST_MANAGEMENT_DB_NAME) TO $(TEST_MGMT_READ_USER), $(TEST_MGMT_READ_WRITE_USER); \
		GRANT USAGE ON SCHEMA public TO $(TEST_MGMT_READ_USER), $(TEST_MGMT_READ_WRITE_USER); \
		GRANT SELECT ON ALL TABLES IN SCHEMA public TO $(TEST_MGMT_READ_USER); \
		GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO $(TEST_MGMT_READ_USER); \
		GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO $(TEST_MGMT_READ_WRITE_USER); \
		GRANT SELECT, USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $(TEST_MGMT_READ_WRITE_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO $(TEST_MGMT_READ_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO $(TEST_MGMT_READ_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO $(TEST_MGMT_READ_WRITE_USER); \
		ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, USAGE, UPDATE ON SEQUENCES TO $(TEST_MGMT_READ_WRITE_USER);"
	@echo "Management test database $(TEST_MANAGEMENT_DB_NAME) ready."

# Stop and remove test Postgres and Valkey containers. Idempotent.
test_clean:
	@docker rm -f $(TEST_PG_CONTAINER) 2>/dev/null || true
	@docker rm -f $(TEST_VALKEY_CONTAINER) 2>/dev/null || true
	@echo "Test containers removed (Postgres, Valkey)."

# Print instructions for meeting test requirements.
help_test:
	@echo "Test requirements: Postgres on port $(TEST_DB_PORT) and Valkey on port $(TEST_VALKEY_PORT)."
	@echo "Databases: $(TEST_DB_NAME), $(TEST_MANAGEMENT_DB_NAME)."
	@echo "Users: $(TEST_APP_READ_USER), $(TEST_APP_READ_WRITE_USER), $(TEST_MGMT_READ_USER), $(TEST_MGMT_READ_WRITE_USER)."
	@echo ""
	@echo "Both databases live in the SAME Postgres container ($(TEST_PG_CONTAINER))."
	@echo "Verify both DBs after make test_deps:  make test_db_list"
	@echo ""
	@echo "From repo root, run:"
	@echo "  make test_deps"
	@echo ""
	@echo "This will:"
	@echo "  1. Start Postgres on port $(TEST_DB_PORT) (if not already running)."
	@echo "  2. Start Valkey on port $(TEST_VALKEY_PORT) (if not already running)."
	@echo "  3. Drop and recreate $(TEST_DB_NAME), then run linear migrations (--database app)."
	@echo "  4. Drop and recreate $(TEST_MANAGEMENT_DB_NAME), then run linear migrations (--database management)."
	@echo ""
	@echo "Forward-only migration checks: scripts/database/validate-linear-migrations.sh"
	@echo "Forward-only migration apply:  scripts/database/run-linear-migrations.sh --database app|management"
	@echo ""
	@echo "Port coexistence: Metaboost test uses 5632/6579. Podverse dev uses 5432/6379."
	@echo "Podverse test uses $(TEST_DB_PORT)/$(TEST_VALKEY_PORT) — no conflicts."
	@echo ""
	@echo "Then run:  npm run test:e2e:api  (or npm test for full suite)."
	@echo ""
	@echo "make test_clean removes test containers."
