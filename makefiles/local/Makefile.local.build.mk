# --- Local Docker image building. ---

.PHONY: local_build_api local_build_workers local_build_management_api local_build_web_base
.PHONY: local_build_management_web_base local_build_web local_build_web_runtime_config
.PHONY: local_build_management_web local_build_management_web_runtime_config local_build_all

local_build_api:
	docker build -f apps/api/Dockerfile -t podverse-api:latest .

local_build_workers:
	docker build -f apps/workers/Dockerfile -t podverse-workers:latest .

local_build_management_api:
	docker build -f apps/management-api/Dockerfile -t podverse-management-api:latest .

local_build_web_base:
	docker build -f apps/web/Dockerfile.base -t ghcr.io/podverse/podverse/web-base:alpha .

local_build_management_web_base:
	docker build -f apps/management-web/Dockerfile.base -t ghcr.io/podverse/podverse/management-web-base:alpha .

local_build_web: local_build_web_base
	docker build -f apps/web/Dockerfile -t podverse-web:latest .

local_build_web_runtime_config:
	docker build -f apps/web/sidecar/Dockerfile -t podverse-web-runtime-config:latest .

local_build_management_web: local_build_management_web_base
	docker build -f apps/management-web/Dockerfile -t podverse-management-web:latest .

local_build_management_web_runtime_config:
	docker build -f apps/management-web/sidecar/Dockerfile -t podverse-management-web-runtime-config:latest .

local_build_all: local_build_api local_build_workers local_build_management_api local_build_web local_build_web_runtime_config local_build_management_web local_build_management_web_runtime_config
	@echo "All Docker images built successfully"
