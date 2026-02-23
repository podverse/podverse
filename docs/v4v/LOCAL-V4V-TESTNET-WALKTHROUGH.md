---
title: "Local V4V Testnet Walkthrough"
---

# Local V4V Testnet Walkthrough

This document gives **concrete steps** to go from a clean slate to successfully sending a boost on the local Lightning regtest and verifying it. It covers Nix activation, nuke/rebuild with V4V, test asset generation, navigating to a media page to use the Boost feature, browser wallet recommendation and testnet configuration, verification, and separate test paths for **LNAddress** and **Keysend**.

For deeper setup (Nigiri install options, Boostbox repo layout), see [LOCAL-LIGHTNING.md](../infra/LOCAL-LIGHTNING.md) and [LOCAL-BOOSTBOX.md](../infra/LOCAL-BOOSTBOX.md).

## Prerequisites

- **Docker**: Installed and running
- **Node.js and npm**: Monorepo uses npm workspaces
- **Nix** (optional but recommended): For Nigiri and jq without manual install

## Step 1: Nix activation (optional but recommended)

Enter the V4V dev shell so `nigiri` and `jq` are in PATH for later steps:

```bash
nix develop .#v4v
```

If you use Fish:

```bash
nix develop .#v4v-fish
```

If you are not using Nix, install Nigiri and jq per [LOCAL-LIGHTNING.md](../infra/LOCAL-LIGHTNING.md) before continuing.

## Step 2: Nuke and rebuild with V4V

From the monorepo root, run:

```bash
make local_nuke_rebuild_run_v4v
```

This single command:

1. Tears down all local infra (including the Lightning stack via `scripts/ln/stop-nigiri-stack.sh`)
2. Prunes Podverse Docker images
3. Builds all images (including Boostbox)
4. Starts the Lightning Network (`make local_ln_up`), which **provisions** the regtest: syncs the chain, funds LND and CLN with 1 BTC each, and opens an LND–CLN channel—no manual block generation or channel opening needed
5. Runs setup (DB init, management DB init, etc.)
6. Starts all apps and workers

For more on provisioning (what runs, troubleshooting), see [LOCAL-LIGHTNING.md](../infra/LOCAL-LIGHTNING.md).

**Expected outcome:**

- Web app: http://localhost:3000
- API: http://localhost:1234
- Boostbox: http://localhost:8080
- LNURL server: http://localhost:3003
- Chopsticks (faucet): http://localhost:3030
- Esplora (block explorer): http://localhost:8282

## Step 3: Generate test assets with V4V tags

LN is already up and provisioned from the nuke step (chain synced, LND/CLN funded with 1 BTC each, channel open), so `tools/test-assets/config/ln-recipients.local.json` should exist (written by `make local_ln_up`).

**Generate feeds and assets with value tags:**

```bash
npm run generate -w tools/test-assets -- --add-fake-value-tags
```

Confirm when prompted. This creates RSS feeds under `tools/test-assets/assets/feeds/` (e.g. `feed-podcast-1.rss`) with `<podcast:value>` tags that include both **node** (keysend) and **lnaddress** recipients; see [V4V-METABOOST-LNURL.md](V4V-METABOOST-LNURL.md).

**Populate the database** so podcasts appear in the web app:

```bash
npm run generate_and_parse -w podverse-test-assets -- --add-fake-value-tags
```

Confirm when prompted. This requires the test-assets server and DB to be available (both are running after the nuke step if you use Docker for apps). Feeds are served at `http://localhost:2111/feeds/` (e.g. `http://localhost:2111/feeds/feed-podcast-1.rss`).

## Step 4: Navigate to a media page and open Boost

1. Open the web app: http://localhost:3000
2. Find a podcast that has value data: search or browse for a podcast that was parsed from the generated feeds (e.g. the title from `feed-podcast-1.rss`).
3. Go to the **podcast page** (e.g. click the podcast from search; URL will be `/podcast/<channel_id>`).
4. Optionally open an **episode** (click an episode to go to `/episode/<item_id>`).
5. In the media header, a **gold Boost** (dollar/comment) button appears when the channel has value recipients.
6. Click it to open the Boost modal. Enter amount and optional message, then send (your WebLN wallet will be prompted).

## Browser extension wallet and testnet configuration

A **WebLN-compatible** wallet is required to boost from the browser. **Alby supports regtest** via its
built-in LND direct connector. Use the **LND HTTP proxy** (started automatically by `make local_ln_up`)
to connect without any TLS certificate setup or macaroon conversion.

### Alby setup for regtest

**Connect in Alby:**

1. Install the [Alby browser extension](https://getalby.com/) (Chrome/Firefox).
2. Open the Alby setup flow. When asked how to connect, choose **Connect** and then select **LND**.
3. Enter the **LND REST URL**: `http://localhost:8181`
4. Enter any non-empty string in the **Macaroon** field — the proxy injects the real admin macaroon
   automatically, so the value you enter here is ignored.
5. Save and connect. Alby validates the connection by calling `/v1/getinfo` through the proxy. On success,
   the extension is ready to send payments on regtest.

**If the connection fails:** Confirm the LND HTTP proxy is running (`docker ps | grep lnd_http_proxy`).
If LND is not yet started, run `make local_ln_up` first.

### Alternative: LND CLI (no browser wallet needed)

You can verify the full payment flow without a browser wallet using the LND CLI:

```bash
nigiri lnd listpayments    # outgoing payments
nigiri lnd listinvoices    # incoming invoices
nigiri lnd addinvoice --amt 1000 --memo "Test payment"
nigiri lnd sendpayment --dest <pubkey> --amt 1000 --keysend
```

See [LOCAL-LIGHTNING.md](../infra/LOCAL-LIGHTNING.md) for full CLI payment steps.

## Verification that a boost worked

- **BoostBox**: If using metaBoost, check that the boost message appears (BoostBox store or logs; Boostbox runs at http://localhost:8080).
- **LND**: Run `nigiri lnd listpayments` (outgoing) or `nigiri lnd listinvoices` (incoming) to see payments.
- **Web app**: The Boost modal should show success; you can also visit http://localhost:3000/v4v/boost-messages for context on boost messages.

## Test path: LNAddress implementation

**What it is:** Payment via LNURL-pay: the app requests an invoice from a Lightning Address (e.g. `alice@localhost:3003`) and pays it with WebLN `sendPayment`. Test assets include recipients with `type="lnaddress"`.

**Steps:**

1. Use a podcast or episode that has value recipients (the generated feeds include lnaddress recipients).
2. Open the Boost modal, enter amount and (optionally) message.
3. Confirm the wallet prompts for an **invoice-based** payment (LNURL-pay).
4. After payment, verify with `nigiri lnd listpayments` and optionally in BoostBox if metaBoost is used.

## Test path: Keysend implementation

**What it is:** Direct keysend to a node pubkey (no invoice). Test assets include `type="node"` recipients (LND/CLN pubkeys from `ln-recipients.local.json`). The app uses WebLN `keysend` (or equivalent) with optional bLIP-0010 / metaBoost message.

**Steps:**

1. Use the same podcast/episode (or any with value recipients).
2. Open the Boost modal; the app may show multiple recipients (node vs lnaddress).
3. The wallet should trigger **keysend** for node recipients.
4. Verify with `nigiri lnd listpayments` and BoostBox if metaBoost is used.

## Troubleshooting

- **LND not ready, port conflicts, LNURL server:** See [LOCAL-LIGHTNING.md](../infra/LOCAL-LIGHTNING.md) (e.g. LND Not Ready, Port Conflicts, LNURL Server Can't Connect to LND).
- **Boost button not showing:** Ensure the feed was parsed with value tags and the channel has `channel_values`. Re-run `npm run generate_and_parse -w podverse-test-assets -- --add-fake-value-tags` and confirm the podcast appears with value data.
- **Wallet not connecting:** Confirm LND is reachable (e.g. `curl -k` to the LND REST endpoint), that the macaroon and TLS cert paths are correct, and that the extension supports a custom node or localhost.
