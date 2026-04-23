# ==========================================
# V4V local services (Lightning Network)
# ==========================================
# Included by makefiles/local/Makefile.local.infra.mk so targets are available for local_infra_up,
# local_infra_up_full, local_all_down, local_clean. Can also be used standalone from repo root:
#   make -f makefiles/local/Makefile.local.v4v.mk local_ln_up
# Requires: makefiles/local/Makefile.local.infra.mk (for local_network_create and config paths).

# LND HTTP proxy (plain HTTP → LND HTTPS REST; auto-injects macaroon)
.PHONY: local_lnd_http_proxy_up
local_lnd_http_proxy_up: local_network_create
	@if [ "$$(uname -s)" = "Darwin" ]; then \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/Library/Application Support/Nigiri"; \
	else \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/.nigiri/regtest"; \
	fi; \
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml up -d

.PHONY: local_lnd_http_proxy_down
local_lnd_http_proxy_down:
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml down --remove-orphans

# Lightning Network (Nigiri CLI + LNURL server + LND HTTP proxy)
# Nigiri provides Bitcoin Core + LND + Core Lightning on regtest.
# Install Nigiri: curl https://getnigiri.vulpem.com | bash
# See docs/v4v/bitcoin/lnd/LOCAL-LIGHTNING.md for full setup.

.PHONY: local_ln_check_nigiri
local_ln_check_nigiri:
	@command -v nigiri >/dev/null 2>&1 || { \
		echo ""; \
		echo "ERROR: Nigiri CLI not found."; \
		echo "If using Nix, run: nix develop .#v4v"; \
		echo "Or install with: curl https://getnigiri.vulpem.com | bash"; \
		echo "Then restart your terminal."; \
		echo ""; \
		exit 1; \
	}

.PHONY: local_ln_check_jq
local_ln_check_jq:
	@command -v jq >/dev/null 2>&1 || { \
		echo ""; \
		echo "ERROR: jq not found (required for parsing node info)."; \
		echo "Install with: brew install jq (macOS) or apt install jq (Linux)"; \
		echo ""; \
		exit 1; \
	}

# Ensure Esplora uses host port 8282 (not 5000) to avoid conflicts e.g. macOS AirPlay
.PHONY: local_ln_ensure_esplora_port
local_ln_ensure_esplora_port:
	@./scripts/v4v/btc/ln/ensure-nigiri-port-override.sh

# LND recipient nodes (alice, bob, fee) — dedicated keysend targets; never the sender
.PHONY: local_ln_recipient_nodes_up
local_ln_recipient_nodes_up: local_network_create
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml up -d

.PHONY: local_ln_recipient_nodes_down
local_ln_recipient_nodes_down:
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml down --remove-orphans

.PHONY: local_ln_verify_recipient_creds
local_ln_verify_recipient_creds:
	@echo "Verifying LNURL recipient credentials are mounted..."
	@docker exec podverse_local_lnurl_server sh -c 'for u in alice bob fee; do \
		test -f "/$$u-creds/data/chain/bitcoin/regtest/admin.macaroon" || { \
			echo "ERROR: Missing /$$u-creds/data/chain/bitcoin/regtest/admin.macaroon"; exit 1; }; \
		test -f "/$$u-creds/tls.cert" || { \
			echo "ERROR: Missing /$$u-creds/tls.cert"; exit 1; }; \
	done'
	@echo "Recipient credentials verified."

.PHONY: local_ln_up
local_ln_up: local_network_create local_ln_check_nigiri local_ln_check_jq local_ln_ensure_esplora_port
	@echo "Starting Nigiri (Bitcoin Core + LND + Core Lightning)..."
	@./scripts/v4v/btc/ln/start-nigiri-with-esplora-port.sh
	@echo "Waiting for LND to be ready..."
	@./scripts/v4v/btc/ln/wait-for-lnd.sh
	@echo "Provisioning regtest (sync chain, fund LND/CLN 1 BTC, open channel)..."
	@./scripts/v4v/btc/ln/provision-regtest.sh
	@echo "Ensuring LN recipient volumes exist (shared by recipient nodes and LNURL server)..."
	@docker volume create podverse_local_lnd_alice_data 2>/dev/null || true
	@docker volume create podverse_local_lnd_bob_data 2>/dev/null || true
	@docker volume create podverse_local_lnd_fee_data 2>/dev/null || true
	@echo "Starting LND recipient nodes (alice, bob, fee)..."
	@docker compose -f infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml up -d
	@echo "Waiting for recipient nodes to create credentials (avoid self-payment fallback)..."
	@sleep 8
	@echo "Starting LND HTTP proxy..."
	@if [ "$$(uname -s)" = "Darwin" ]; then \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/Library/Application Support/Nigiri"; \
	else \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/.nigiri/regtest"; \
	fi; \
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml up -d
	@echo "Provisioning recipient nodes (fund + connect + open channels)..."
	@./scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh
	@echo "Discovering node pubkeys and writing ln-recipients.local.json..."
	@./scripts/v4v/btc/ln/discover-recipients.sh
	@echo "Starting LNURL server after recipient provisioning..."
	@if [ "$$(uname -s)" = "Darwin" ]; then \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/Library/Application Support/Nigiri"; \
	else \
		export NIGIRI_LND_CREDENTIALS_PATH="$$HOME/.nigiri/regtest"; \
	fi; \
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnurl-server/docker-compose.yml up -d --force-recreate
	@$(MAKE) local_ln_verify_recipient_creds
	@echo ""
	@echo "Lightning Network ready!"
	@echo "  Esplora (block explorer): http://localhost:8282"
	@echo "  Chopsticks (faucet): http://localhost:3030"
	@echo "  LND REST: https://localhost:18080"
	@echo "  LND HTTP proxy: http://localhost:8181  (use this for Alby — no TLS or macaroon needed)"
	@echo "  LNURL server: http://localhost:3003"
	@echo "  Recipient nodes: alice (REST :18081), bob (REST :18082), fee (REST :18083)"
	@echo "  Config: tools/test-assets/config/ln-recipients.local.json"
	@echo ""

.PHONY: local_ln_down
local_ln_down:
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml down --remove-orphans 2>/dev/null || true
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnurl-server/docker-compose.yml down 2>/dev/null || true
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml down 2>/dev/null || true
	@./scripts/v4v/btc/ln/stop-nigiri-stack.sh
	nigiri stop 2>/dev/null || true

.PHONY: local_ln_clean
local_ln_clean:
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnurl-server/docker-compose.yml down -v 2>/dev/null || true
	docker compose -f infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml down -v 2>/dev/null || true
	docker volume rm podverse_local_lnd_alice_data 2>/dev/null || true
	docker volume rm podverse_local_lnd_bob_data 2>/dev/null || true
	docker volume rm podverse_local_lnd_fee_data 2>/dev/null || true
	@./scripts/v4v/btc/ln/stop-nigiri-stack.sh --volumes
	nigiri stop --delete 2>/dev/null || true
	rm -f tools/test-assets/config/ln-recipients.local.json
	@echo "Lightning Network state cleaned."
