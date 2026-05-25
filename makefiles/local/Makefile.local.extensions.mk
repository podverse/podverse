# Extension sidecars (optional local Compose profiles; not part of local_infra_up)
COMPOSE_EXTENSIONS_FILE := infra/docker/local/extensions/docker-compose.yml
COMPOSE_EXTENSIONS := docker compose -f $(COMPOSE_EXTENSIONS_FILE)

.PHONY: local_extensions_up local_extensions_prometheus_up local_extensions_down
.PHONY: local_extension_prometheus_up local_extension_prometheus_down

local_extensions_prometheus_up: local_build_extension_prometheus local_network_create infra/config/local/extensions.env infra/config/local/extension-sidecar-otel.env infra/config/local/extension-prometheus.env
	$(COMPOSE_EXTENSIONS) --profile extensions-prometheus up -d

local_extensions_up: local_build_extension_prometheus local_network_create infra/config/local/extensions.env infra/config/local/extension-sidecar-otel.env infra/config/local/extension-prometheus.env
	$(COMPOSE_EXTENSIONS) --profile extensions up -d

local_extensions_down:
	$(COMPOSE_EXTENSIONS) --profile extensions --profile extensions-prometheus down

# Deprecated aliases (plan 08 renamed targets)
local_extension_prometheus_up: local_extensions_prometheus_up

local_extension_prometheus_down: local_extensions_down
