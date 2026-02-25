---
title: "Local Lightning Network (Nigiri)"
---

# Local Lightning Network (Nigiri)

This guide describes how to run a local Bitcoin Lightning regtest network for Podverse
V4V end-to-end testing using [Nigiri](https://github.com/vulpemventures/nigiri).

Nigiri is a CLI tool that manages Docker containers for Bitcoin Core, LND, Core Lightning,
and supporting services. It provides a fully automated, headless setup without requiring
a GUI application.

## Prerequisites

- **Docker**: Installed and running
- **Nigiri CLI**: See installation options below
- **jq**: For JSON parsing (`brew install jq` on macOS, or included in Nix dev shell)

## Installing Nigiri

### Option 1: Nix (Opt-in V4V shell)

Nigiri is intentionally **not** in the default shell. Enter the V4V shell to include it:

```bash
nix develop .#v4v
nigiri --version
```

If you prefer fish:

```bash
nix develop .#v4v-fish
```

The flake fetches the Nigiri binary automatically in these V4V shells - no manual curl needed.

**First-time Nix users**: On the first `nix develop .#v4v`, Nix may report a hash mismatch
for the Nigiri binary. This is expected - update the sha256 in `nix/v4v.nix` with the
hash shown in the error message. See [Updating Nigiri Version](#updating-nigiri-version)
below.

### Option 2: curl (Manual installation)

Install Nigiri globally:

```bash
curl https://getnigiri.vulpem.com | bash
```

This installs the `nigiri` binary to `/usr/local/bin/`. Restart your terminal after installation.

### Verify Installation

```bash
nigiri --version
```

## Quick Start

```bash
# Start the Lightning Network (Bitcoin Core + LND + CLN + LNURL server)
make local_ln_up

# Stop the Lightning Network (preserves state)
make local_ln_down

# Clean/reset the Lightning Network (removes all state)
make local_ln_clean
```

## What Gets Started

When you run `make local_ln_up`, the following services start:

| Service                  | Port                                                             | Description                                                                           |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Esplora (block explorer) | 8282                                                             | Bitcoin block explorer (port 8282 to avoid conflicts with e.g. macOS AirPlay on 5000) |
| Bitcoin Core             | 18443 (RPC)                                                      | Regtest Bitcoin node                                                                  |
| LND                      | 18080 (REST), 10009 (gRPC), 9735 (P2P)                           | Lightning Network Daemon                                                              |
| LND HTTP Proxy           | 8181                                                             | Plain HTTP proxy for LND REST API (auto-injects macaroon; no TLS needed)              |
| Core Lightning           | 9835 (P2P on host); 9935 (P2P in container, for LND→CLN connect) | c-lightning implementation                                                            |
| Electrs                  | 60001                                                            | Electrum server (TCP/Electrum RPC; no web UI in browser)                              |
| Chopsticks               | 3030                                                             | Faucet and block mining (3030 to avoid conflict with web app on 3000)                 |
| LNURL Server             | 3003                                                             | Lightning Address support; try http://localhost:3003/ or /health                      |

The block explorer uses port **8282** (not Nigiri's default 5000). Because Docker Compose does not auto-merge an override when Nigiri uses `-f`, `make local_ln_up` runs `scripts/v4v/btc/ln/start-nigiri-with-esplora-port.sh`, which tries `nigiri start --ln` and, if it fails (e.g. port 5000 in use), patches the compose file and runs `docker compose` with the override so Esplora binds to 8282. No system settings (e.g. AirPlay) need to be changed.

## Auto-Configuration

The `make local_ln_up` target automatically:

1. Starts Nigiri with Lightning nodes
2. Waits for LND to be ready
3. **Provisions the regtest:** syncs the chain, funds LND and CLN with **1 BTC each**, and opens an LND–CLN channel so the network is ready for V4V testing without manual steps
4. Starts/recreates the LNURL server after recipient provisioning
5. Discovers node pubkeys from LND and CLN
6. Writes `tools/test-assets/config/ln-recipients.local.json`
7. Verifies LNURL recipient credential mounts (`alice`, `bob`, `fee`) before printing readiness

The generated config file contains the actual node pubkeys and LNURL addresses,
which are used when generating test assets with `--add-fake-value-tags`.

## Manual Node Interaction

Provisioning is automatic and gives each wallet (LND and CLN) **1 BTC** and opens a channel. You only need the commands below if you want to re-fund or mine blocks manually.

Use Nigiri CLI commands to interact with nodes:

```bash
# LND commands
nigiri lnd getinfo
nigiri lnd listpeers
nigiri lnd addinvoice --amt 1000

# Core Lightning commands
nigiri cln getinfo
nigiri cln listpeers

# Bitcoin commands
nigiri rpc getblockchaininfo

# Optional: re-fund or mine blocks manually
nigiri faucet lnd 1     # Fund LND with 1 BTC
nigiri faucet cln 1    # Fund CLN with 1 BTC
nigiri rpc -generate 6 # Mine 6 blocks
```

## LNURL Server

The local LNURL server provides Lightning Address support at `http://localhost:3003`.

Lightning Addresses:

- `alice@localhost:3003`
- `bob@localhost:3003`
- `fee@localhost:3003`

Test the LNURL server:

```bash
# Health check
curl http://localhost:3003/health

# Lightning Address discovery
curl http://localhost:3003/.well-known/lnurlp/alice
```

## LND HTTP Proxy

The local LND HTTP proxy is available at `http://localhost:8181`. It forwards all requests to LND's HTTPS REST API and automatically injects the admin macaroon, so you can call LND without managing TLS certificates or auth headers:

```bash
# No TLS or macaroon needed — the proxy handles both
curl http://localhost:8181/v1/getinfo
curl http://localhost:8181/v1/balance/channels
```

The proxy is started automatically by `make local_ln_up` alongside the LNURL server.

## Workflow

### Full E2E with V4V (Recommended for Value Testing)

Use the V4V nuke-rebuild-run command for a complete reset with Lightning:

```bash
make local_nuke_rebuild_run_v4v
```

This command:

1. Destroys all local containers and volumes
2. Rebuilds all images
3. Starts Nigiri + LNURL server
4. Initializes databases
5. Starts all apps and workers

### Fresh Start (Just Lightning)

```bash
make local_ln_clean           # Remove all LN state
make local_ln_up              # Start fresh, auto-populate config
make local_infra_up           # Start other Podverse services
npm run generate -w tools/test-assets -- --add-fake-value-tags
```

### Full Infrastructure with Lightning

```bash
make local_infra_up_full      # Starts all infra + Lightning Network
```

### Daily Development

```bash
make local_ln_up              # Start/restart (updates config if pubkeys changed)
```

### Generate Test Assets with V4V Tags

```bash
npm run generate -w tools/test-assets -- --add-fake-value-tags
```

This generates RSS feeds with:

- `<podcast:value>` tags that can mix `type="node"` and `type="lnaddress"` recipients per value block
- Keysend recipients use the actual LND and CLN pubkeys
- LNURL recipients use the local LNURL server addresses

## WebLN Wallet Configuration

To test V4V payments from the browser, you need a WebLN-compatible wallet
configured for regtest. This is a manual step. For a full step-by-step from Nix
to boost and verification (including wallet setup and LNAddress/Keysend test
paths), see [LOCAL-V4V-TESTNET-WALKTHROUGH.md](LOCAL-V4V-TESTNET-WALKTHROUGH.md).

### Alby

[Alby](https://getalby.com/) supports regtest via its built-in LND direct connector. Use the **LND HTTP
proxy** (started automatically by `make local_ln_up` at `http://localhost:8181`) to avoid TLS certificate
issues entirely — no keychain setup or macaroon conversion needed.

In the Alby setup flow, choose **Connect** → **LND**, then enter:

- **URL**: `http://localhost:8181`
- **Macaroon**: any non-empty hex string (the proxy injects the real macaroon automatically)

Alby validates by calling `/v1/getinfo` through the proxy. On success the extension is on regtest.

For the full end-to-end walkthrough (Nix activation → boost → verification), see
[LOCAL-V4V-TESTNET-WALKTHROUGH.md](LOCAL-V4V-TESTNET-WALKTHROUGH.md).

### Alternative: Direct LND Testing

For testing without a browser wallet, use the LND CLI directly:

```bash
# Create an invoice
nigiri lnd addinvoice --amt 1000 --memo "Test payment"

# Pay an invoice
nigiri lnd payinvoice <bolt11_invoice>

# Keysend payment
nigiri lnd sendpayment --dest <pubkey> --amt 1000 --keysend
```

## Troubleshooting

### macOS

On macOS, Nigiri uses `~/Library/Application Support/Nigiri` (not `~/.nigiri`). The Makefile sets `NIGIRI_LND_CREDENTIALS_PATH` automatically when starting the LNURL server, so `make local_ln_up` works without extra steps. If LND does not become ready, see [LND Not Ready](#lnd-not-ready); if the LNURL server cannot reach LND, see [LNURL Server Can't Connect to LND](#lnurl-server-cant-connect-to-lnd).

### Nigiri Not Found

```
ERROR: Nigiri CLI not found.
```

Install Nigiri:

```bash
curl https://getnigiri.vulpem.com | bash
```

Then restart your terminal.

### LND Not Ready

```
ERROR: LND did not become ready within 120 seconds.
```

Check Docker is running and has enough resources. View logs:

```bash
nigiri logs lnd
```

If the stack was started via the fallback (e.g. after a port-5000 failure), LND can take longer to start. Try a clean LN-only start:

```bash
make local_ln_clean
make local_ln_up
```

`make local_ln_up` now checks LND readiness and discovers node pubkeys via Docker when needed, so it still works if `nigiri ...` reports "nigiri is not running" after fallback startup.

### Port Conflicts

If ports are in use:

- Port 18080: LND REST API (Nigiri). Boostbox uses 8080; they do not conflict.
- Port 8181: LND HTTP proxy. Check for other services on this port; test with `curl http://localhost:8181/v1/getinfo`.
- Port 3000: Podverse web app. Chopsticks is moved to 3030 by the override to avoid conflict.
- Port 3003: LNURL server. Check for other services on this port; visit http://localhost:3003/ or http://localhost:3003/health to confirm it is up.

The Bitcoin block explorer (Esplora) is exposed on **8282** (not 5000), so port 5000 is not used and conflicts with e.g. macOS AirPlay Receiver are avoided.

### LNURL Server Can't Connect to LND

The LNURL server mounts LND credentials from Nigiri's data directory. The Makefile sets `NIGIRI_LND_CREDENTIALS_PATH` automatically: on **macOS** it uses `~/Library/Application Support/Nigiri`; on Linux it uses `~/.nigiri`. If you start the LNURL server manually (e.g. `docker compose` in `infra/docker/local/v4v/bitcoin/lnd/lnurl-server/`), on macOS you must export this path first.

Use `make local_ln_up` as the canonical startup flow. It now recreates LNURL server after recipient provisioning and runs a credential verification gate.

Check that the macaroon and TLS cert exist (use the path for your OS):

```bash
# Linux
ls -la ~/.nigiri/regtest/volumes/lnd/data/chain/bitcoin/regtest/admin.macaroon
ls -la ~/.nigiri/regtest/volumes/lnd/tls.cert

# macOS (no regtest/ prefix in the Nigiri data path on macOS)
ls -la "$HOME/Library/Application Support/Nigiri/volumes/lnd/data/chain/bitcoin/regtest/admin.macaroon"
ls -la "$HOME/Library/Application Support/Nigiri/volumes/lnd/tls.cert"
```

**macOS path note:** On macOS, Nigiri stores LND data at `~/Library/Application Support/Nigiri/volumes/lnd/`
(no `regtest/` in the middle), unlike Linux which uses `~/.nigiri/regtest/volumes/lnd/`. The Makefile
and docker-compose account for this difference automatically.

**Docker created macaroon as a directory:** If you see `xxd: Is a directory` or the LNURL server fails
to mount the macaroon, Docker created a directory at the host path because the LNURL server container
was started before LND generated the file. Fix:

```bash
# macOS
rm -rf "$HOME/Library/Application Support/Nigiri/volumes/lnd/data/chain/bitcoin/regtest/admin.macaroon"

# Linux
rm -rf ~/.nigiri/regtest/volumes/lnd/data/chain/bitcoin/regtest/admin.macaroon
```

Then run `make local_ln_clean && make local_ln_up` to restart cleanly.

LND REST is on port **18080** (not 8080). If http://localhost:3003 is not reachable, confirm the LNURL server container is running (`docker ps`) and that it has the correct volume mounts; then check logs:

```bash
docker logs podverse_local_lnurl_server
```

If boosts fail with recipient errors like `No macaroon available for alice`, run:

```bash
make local_ln_verify_recipient_creds
```

If this check fails, run a clean cycle:

```bash
make local_ln_clean
make local_ln_up
```

### lncli inside LND container: mainnet macaroon error

If you run `docker exec lnd lncli getinfo` and see an error like "unable to read macaroon path ... mainnet/admin.macaroon", you must pass `--network=regtest` because Nigiri runs LND on regtest (macaroons live under `.../bitcoin/regtest/...`, not mainnet). Use:

```bash
docker exec lnd lncli --network=regtest getinfo
```

Prefer running `nigiri lnd getinfo` (and other commands like `nigiri lnd listpayments`, `nigiri lnd addinvoice`) from the host instead of exec'ing into the container; the Nigiri CLI handles the network and paths for you.

### Provisioning fails

If `make local_ln_up` fails during "Provisioning regtest" (e.g. script exits with an error), run the provision script manually to see detailed output:

```bash
./scripts/v4v/btc/ln/provision-regtest.sh
```

Ensure Bitcoin and LND/CLN containers are up (`docker ps`). If the chain never syncs or funding fails, try a clean start: `make local_ln_clean` then `make local_ln_up`.

## Make Targets

| Target                            | Description                                 |
| --------------------------------- | ------------------------------------------- |
| `make local_ln_up`                | Start Lightning Network + LNURL server      |
| `make local_ln_down`              | Stop Lightning (preserves state)            |
| `make local_ln_clean`             | Stop and delete all Lightning state         |
| `make local_infra_up_full`        | Start all infra including Lightning         |
| `make local_nuke_rebuild_run_v4v` | Full rebuild with Lightning for V4V testing |

## Nix, Makefile, and config

- **Nix:** The root flake’s `.#v4v` and `.#v4v-fish` shells (`nix/v4v.nix`) are the shared entry point for Bitcoin LN local dev (Nigiri + jq).
- **Makefile:** `Makefile.local.v4v` is the single shared entry for all V4V local targets; LN targets (`local_ln_*`, `local_lnd_http_proxy_*`, `local_ln_recipient_nodes_*`) are documented in this doc.
- **Config:** `tools/test-assets/config/ln-recipients.local.json` is generated by `discover-recipients.sh` and consumed by the test-asset value-tag generator; it is the bridge between the LN stack and test feeds.

## File Locations

| File                                                           | Purpose                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `nix/v4v.nix`                                                  | Nigiri + V4V shell config; root `flake.nix` exposes `.#v4v` using it                                              |
| `Makefile.local.v4v`                                           | Make targets for local*ln*\* (included by Makefile.local.infra)                                                   |
| `Makefile.local.apps`                                          | Make targets for local_nuke_rebuild_run_v4v                                                                       |
| `scripts/v4v/btc/ln/ensure-nigiri-port-override.sh`            | Writes docker-compose.override.yml so Esplora uses port 8282                                                      |
| `scripts/v4v/btc/ln/start-nigiri-with-esplora-port.sh`         | Runs nigiri start; on port-5000 failure, patches compose and runs docker compose with override (LN services only) |
| `scripts/v4v/btc/ln/wait-for-lnd.sh`                           | Health check script                                                                                               |
| `scripts/v4v/btc/ln/provision-regtest.sh`                      | Syncs chain, funds LND/CLN with 1 BTC each, opens LND–CLN channel                                                 |
| `scripts/v4v/btc/ln/discover-recipients.sh`                    | Auto-config script                                                                                                |
| `infra/docker/local/v4v/bitcoin/lnd/lnurl-server/`             | LNURL server Docker setup                                                                                         |
| `infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/`       | LND recipient nodes (alice, bob, fee) Docker setup                                                                |
| `infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/`           | LND HTTP proxy Docker setup                                                                                       |
| `tools/test-assets/config/ln-recipients.local.json`            | Auto-generated recipient config                                                                                   |
| `~/.nigiri/` (or macOS `~/Library/Application Support/Nigiri`) | Nigiri data directory; override written here                                                                      |

## Updating Nigiri Version

When updating the Nigiri version in `nix/v4v.nix`:

1. Update `nigiriVersion` to the new version number
2. Set all sha256 values to placeholder: `sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`
3. Run `nix develop .#v4v` - it will fail with the correct hash
4. Update the sha256 for your platform with the hash from the error message
5. Repeat for each platform you need to support

Example error message:

```
error: hash mismatch in fixed-output derivation '/nix/store/...':
         specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
            got:    sha256-ABC123...
```

Copy the "got" hash to replace the placeholder.

## References

- For the full Bitcoin LN setup and integration diagram (Nix → Docker → test assets → parsing →
  web boost), see [V4V-BITCOIN-LN-SETUP-DIAGRAM.md](V4V-BITCOIN-LN-SETUP-DIAGRAM.md).
- [Nigiri GitHub](https://github.com/vulpemventures/nigiri)
- [Nigiri Documentation](https://nigiri.vulpem.com/)
- [LND REST API](https://api.lightning.community/)
- [LNURL Spec](https://github.com/lnurl/luds)
- [Lightning Address Spec](https://lightningaddress.com/)
