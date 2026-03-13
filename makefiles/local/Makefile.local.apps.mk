# --- Local Docker: run/test apps and workers (parsers, image shrink, api, web). ---

.PHONY: local_test_docker_builds local_test_api local_test_workers local_run_parsers_all local_stop_parsers
.PHONY: local_run_image_shrink_consumer local_stop_image_shrink_consumer local_run_image_shrink_backfill
.PHONY: local_run_workers_all local_stop_workers_all local_test_management_api local_test_web
.PHONY: local_test_management_web local_test_all_apps local_stop_all_apps local_start_all_apps
.PHONY: local_rebuild_all_apps local_nuke_rebuild_run

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

local_test_api: local_build_api
	docker compose -f infra/docker/local/api/docker-compose.yml up -d
	@echo "API started. Check logs with: docker compose -f infra/docker/local/api/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/api/docker-compose.yml down"

local_test_workers: local_build_workers
	docker compose -f infra/docker/local/workers/docker-compose.yml up -d
	@echo "Workers started. Check logs with: docker compose -f infra/docker/local/workers/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/workers/docker-compose.yml down"

local_run_parsers_all: local_build_workers
	@echo "Starting parser workers (mirroring alpha)..."
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_rss_normal_1 podverse_local_workers node apps/workers/dist/index.js mqRSSRunParser -q rss-normal
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_rss_normal_2 podverse_local_workers node apps/workers/dist/index.js mqRSSRunParser -q rss-normal
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_rss_on_demand_1 podverse_local_workers node apps/workers/dist/index.js mqRSSRunParser -q rss-on-demand
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_rss_on_demand_2 podverse_local_workers node apps/workers/dist/index.js mqRSSRunParser -q rss-on-demand
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_rss_live_1 podverse_local_workers node apps/workers/dist/index.js mqRSSRunParser -q rss-live
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_add_by_rss_on_demand_1 podverse_local_workers node apps/workers/dist/index.js mqAddByRSSRunParser -q add-by-rss-on-demand
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_add_by_rss_on_demand_2 podverse_local_workers node apps/workers/dist/index.js mqAddByRSSRunParser -q add-by-rss-on-demand
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_add_by_rss_background_1 podverse_local_workers node apps/workers/dist/index.js mqAddByRSSRunParser -q add-by-rss-background
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_parser_add_by_rss_background_2 podverse_local_workers node apps/workers/dist/index.js mqAddByRSSRunParser -q add-by-rss-background
	@echo "Parser workers started. Stop with: make local_stop_parsers"

local_stop_parsers:
	@matches=$$(docker ps -a --format '{{.Names}}' | grep '^podverse_local_workers_parser_' || true); \
	if [ -n "$$matches" ]; then \
	  echo "Stopping parser containers..."; \
	  echo "$$matches" | xargs docker stop 2>/dev/null || true; \
	  echo "Removing parser containers..."; \
	  echo "$$matches" | xargs docker rm 2>/dev/null || true; \
	  echo "Done."; \
	else \
	  echo "No parser containers found."; \
	fi

local_run_image_shrink_consumer: local_build_workers
	@echo "Starting image shrink consumer..."
	docker compose -f infra/docker/local/workers/docker-compose.yml run -d --name podverse_local_workers_image_shrink_consumer podverse_local_workers node apps/workers/dist/index.js imageShrinkRunConsumer
	@echo "Image shrink consumer started. Stop with: make local_stop_image_shrink_consumer"

local_stop_image_shrink_consumer:
	@matches=$$(docker ps -a --format '{{.Names}}' | grep '^podverse_local_workers_image_shrink_consumer' || true); \
	if [ -n "$$matches" ]; then \
	  echo "Stopping image shrink consumer..."; \
	  echo "$$matches" | xargs docker stop 2>/dev/null || true; \
	  echo "Removing image shrink consumer container..."; \
	  echo "$$matches" | xargs docker rm 2>/dev/null || true; \
	  echo "Done."; \
	else \
	  echo "No image shrink consumer container found."; \
	fi

local_run_image_shrink_backfill: local_build_workers
	@echo "Running image shrink backfill job..."
	docker compose -f infra/docker/local/workers/docker-compose.yml run --rm podverse_local_workers node apps/workers/dist/index.js imageShrinkBackfill
	@echo "Image shrink backfill job completed."

local_run_workers_all: local_run_parsers_all local_run_image_shrink_consumer
	@echo "All workers started (parsers + image shrink consumer)."

local_stop_workers_all: local_stop_parsers local_stop_image_shrink_consumer
	@echo "All workers stopped."

local_test_management_api: local_build_management_api
	docker compose -f infra/docker/local/management-api/docker-compose.yml up -d
	@echo "Management API started. Check logs with: docker compose -f infra/docker/local/management-api/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/management-api/docker-compose.yml down"

local_test_web: local_build_web local_build_web_runtime_config infra/config/local/web.env
	docker compose -f infra/docker/local/web/docker-compose.yml up -d
	@echo "Web started at http://localhost:3000"
	@echo "Check logs with: docker compose -f infra/docker/local/web/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/web/docker-compose.yml down"

local_test_management_web: local_build_management_web local_build_management_web_runtime_config infra/config/local/management-web.env
	docker compose -f infra/docker/local/management-web/docker-compose.yml up -d
	@echo "Management Web started at http://localhost:3100"
	@echo "Check logs with: docker compose -f infra/docker/local/management-web/docker-compose.yml logs -f"
	@echo "Stop with: docker compose -f infra/docker/local/management-web/docker-compose.yml down"

local_test_all_apps: local_build_all infra/config/local/web.env infra/config/local/management-web.env
	docker compose -f infra/docker/local/api/docker-compose.yml up -d
	docker compose -f infra/docker/local/web/docker-compose.yml up -d
	docker compose -f infra/docker/local/management-api/docker-compose.yml up -d
	docker compose -f infra/docker/local/management-web/docker-compose.yml up -d
	@echo ""
	@echo "All apps started:"
	@echo "  - API:            http://localhost:1234"
	@echo "  - Web:            http://localhost:3000"
	@echo "  - Web Sidecar:    podverse_local_web_runtime_config:3001"
	@echo "  - Management API: http://localhost:3998"
	@echo "  - Management Web: http://localhost:3100"
	@echo "  - Management Sidecar: podverse_local_management_web_runtime_config:3101"
	@echo ""
	@echo "Stop all with: make local_stop_all_apps"

local_stop_all_apps:
	docker compose -f infra/docker/local/api/docker-compose.yml down --remove-orphans
	docker compose -f infra/docker/local/web/docker-compose.yml down --remove-orphans
	docker compose -f infra/docker/local/management-api/docker-compose.yml down --remove-orphans
	docker compose -f infra/docker/local/management-web/docker-compose.yml down --remove-orphans
	@echo "All apps stopped"

local_start_all_apps: infra/config/local/web.env infra/config/local/management-web.env
	docker compose -f infra/docker/local/api/docker-compose.yml up -d
	docker compose -f infra/docker/local/web/docker-compose.yml up -d
	docker compose -f infra/docker/local/management-api/docker-compose.yml up -d
	docker compose -f infra/docker/local/management-web/docker-compose.yml up -d
	@echo ""
	@echo "All apps started:"
	@echo "  - API:            http://localhost:1234"
	@echo "  - Web:            http://localhost:3000"
	@echo "  - Web Sidecar:    podverse_local_web_runtime_config:3001"
	@echo "  - Management API: http://localhost:3998"
	@echo "  - Management Web: http://localhost:3100"
	@echo "  - Management Sidecar: podverse_local_management_web_runtime_config:3101"
	@echo ""
	@echo "Stop all with: make local_stop_all_apps"

local_rebuild_all_apps: local_stop_all_apps local_prune_podverse_images local_build_all
	@echo ""
	@echo "All app images rebuilt. Start with: make local_test_all_apps"

local_nuke_rebuild_run:
	$(MAKE) local_clean
	$(MAKE) local_prune_podverse_images
	$(MAKE) local_setup
	$(MAKE) local_build_all
	$(MAKE) local_start_all_apps
	$(MAKE) local_run_workers_all
	@echo ""
	@echo "============================================"
	@echo "Local environment fully rebuilt and running!"
	@echo "============================================"
