---
title: "V4V MetaBoost + LNURL (Local)"
---

# V4V MetaBoost + LNURL (Local)

This guide describes the local, end-to-end workflow for parsing `<podcast:metaBoost>`, storing it,
and sending boost messages with a MetaBoost server + WebLN (Alby or compatible). It also documents the
keysend bLIP-0010 fallback when metaBoost is absent, and the LNAddress behavior when messages are
not enabled.

For a concrete step-by-step from Nix activation through nuke/rebuild V4V, test asset generation,
navigating to a media page to boost, wallet configuration for testnet, and verification (including
separate test paths for LNAddress and Keysend), see [LOCAL-V4V-TESTNET-WALKTHROUGH.md](LOCAL-V4V-TESTNET-WALKTHROUGH.md).

## Diagram

See [V4V-METABOOST-FLOW.md](V4V-METABOOST-FLOW.md). For the full Bitcoin LN setup (Nix, Docker,
test assets, parsing, web boost flow), see [V4V-BITCOIN-LN-SETUP-DIAGRAM.md](V4V-BITCOIN-LN-SETUP-DIAGRAM.md).

## Reference docs

- `podcast:value` spec: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/value.md
- bLIP-0010: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/blip-0010.md
- RSS payment metadata: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/metadata.md
- LNAddress: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/lnaddress.md
- Value slugs: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/valueslugs.txt

## Prerequisites

- MetaBoost server running at `http://localhost:8080`
- Podverse monorepo running locally
- Test assets server running (`npm run dev:test-assets`)
- WebLN-compatible wallet (Alby or similar)

**MetaBoost server (local):** Start any MB1-compatible metadata server on `http://localhost:8080`
before testing.

Notes:

- Lightning Address (LNURLp) resolution and invoice requests are implemented in `@podverse/v4v-btc-ln` using **LUD-16 only**: the app fetches `https://<domain>/.well-known/lnurlp/<user>` (or the same path over http for localhost). Invoice requests use the callback URL from the resolved details, so the Donate page and LNAddress flows work with any LUD-16-compliant provider (Strike, Alby, etc.).

## Local Lightning Network Setup

For local V4V testing with real Lightning payments on regtest, use the automated
Nigiri-based setup. See [LOCAL-LIGHTNING.md](LOCAL-LIGHTNING.md)
for full instructions.

Quick start:

```bash
# Start Lightning Network (Bitcoin Core + LND + CLN + LNURL server)
make local_ln_up

# This automatically:
# 1. Starts Nigiri with Lightning nodes
# 2. Discovers node pubkeys
# 3. Writes tools/test-assets/config/ln-recipients.local.json
```

The generated config file contains actual LND/CLN pubkeys and local LNURL addresses,
which are used when generating test assets with `--add-fake-value-tags`.

## Manual Wallet Setup (Browser Testing)

For browser-based V4V testing, you need a WebLN-compatible wallet configured for regtest.
Wallet support for regtest varies, so verify your provider supports it or use the CLI
testing approach described in [LOCAL-LIGHTNING.md](LOCAL-LIGHTNING.md#alternative-direct-lnd-testing).

When `--add-fake-value-tags` is enabled, the generator uses `ln-recipients.local.json` for
`type="node"` and `type="lnaddress"` recipients. If the file is missing or invalid,
it falls back to built-in fake data.

## Supported recipient types

- `type="node"` for keysend (WebLN keysend)
- `type="lnaddress"` for LNAddress (LNURLp -> invoice)

## LNURLp vs WebLN responsibilities

- `@podverse/v4v-btc-ln` handles LNURLp lookups (LUD-16 only) and invoice requests for LNAddress payments.
- Keysend is performed through WebLN `keysend` for `type="node"` recipients, not via any external HTTP API.
- WebLN supports both `sendPayment` (invoice-based LNURL) and `keysend`; wallet support for keysend is required.
- When RSS `method="keysend"` and a recipient uses `type="lnaddress"`, the app resolves
  `/.well-known/keysend/<user>` and sends keysend via WebLN using the returned pubkey/custom data.
- The app follows the RSS `method` exactly and does not fall back between keysend and LNURLp invoices.

## Error handling and retries

- **LNURL details**: The app retries only on **429** (rate limit) and **5xx** (server errors).
- **LNURL invoice**: The app retries on **400**, **429**, and **5xx** (so "Recipient wallet error"
  and similar 400s may be retried). There are **2 total attempts** (1 retry). Each failed attempt
  is reported in real time on the boost form: first attempt as the raw error, then "Retry 2: …",
  and finally "Failed".
- **In-wallet failures**: Payment failure reasons (e.g. "RecipientRejected", 400 from the wallet
  or recipient) may not be available to the app if the WebLN provider only rejects the Promise
  when the user cancels; the boost form displays whatever the provider includes on rejection.

## MetaBoost tag format

MetaBoost is emitted at the channel level with a required `standard` attribute:

```xml
<channel>
  <podcast:metaBoost standard="mb1">https://api.metaboost.cc/v1/s/mb1/boost/JAyJS6QnNV/</podcast:metaBoost>
  <podcast:value type="lightning" method="keysend" suggested="0.00000005000">
    <podcast:valueRecipient ... />
  </podcast:value>
</channel>
```

Podverse currently supports `mb1` (BTC flow only). Unknown/unsupported standards safely fall back
to legacy V4V behavior (no MetaBoost metadata/confirm flow).

## Generate test assets (includes metaBoost + LNAddress + keysend)

The test assets generator emits a channel-level `podcast:metaBoost standard="mb1"` URL and can mix
`lnaddress` and `node` recipients per value-tagged item (per-recipient randomization):

- metaBoost URL: `https://api.metaboost.cc/v1/s/mb1/boost/BtBwcc9mdz/`
- Each value set includes three recipients with splits `60`, `40`, and `1` (fee).
- Placeholder addresses are used for both recipient types.

Commands:

```bash
npm run dev:test-assets
npm run generate -w tools/test-assets -- --add-fake-value-tags
```

## Parse and store metaBoost

1. Parse a feed (via `tools/test-assets` or ingest tooling).
2. Confirm `channel_value_meta_boost` rows exist in the DB (channel tag is mapped into value metadata
   for runtime compatibility).
3. Parsing generated assets is the official "seeding" step for local testing.

## MetaBoost (MB1) flow

When supported `<podcast:metaBoost standard="mb1">` metadata is present, the client must obtain
MetaBoost metadata before sending payments:

1. POST boost metadata directly to the mb1 endpoint from `<podcast:metaBoost standard="mb1">`.
2. Use the metadata response `desc` string (`rss::payment::{action} {url} {truncated message}`) for:
   - LNAddress invoice comment (when allowed by LNURL).
   - Keysend bLIP-0010 `message` field (so the payload carries the metadata URL).
3. After attempting recipient payments, POST MB1 `recipient_outcomes` back to the confirm endpoint
   from the metadata response.

If metadata fetch fails, a modal warns that the message cannot be sent and the user can "Pay Anyway."
Payments continue with **no memo** (no comment and no bLIP-0010 record).

## Keysend (bLIP-0010) fallback

When metaBoost is **not** present for a keysend recipient (`type="node"`), the client sends a
bLIP-0010 payload in the keysend TLV record **7629169**. The payload is a JSON object encoded
as UTF-8, using the fields documented in bLIP-0010 (guid/episode, action, sender info, and
value_msat_total/value_msat). The `message` field uses the user-entered message.

## Recipient split normalization

When determining how much to send per recipient, splits are normalized relative to a base of 100
and rounded down to the nearest integer (e.g., 60 + 40 + 1 is valid and normalized proportionally).

## LNAddress behavior when metaBoost is absent

When metaBoost is **not** present for LNAddress recipients (`type="lnaddress"`), boost messages are
disabled **for LNURL invoice flows**. The boost form shows a notice with a "More Info" link to
`/v4v/boost-messages`, and the payment proceeds **without** any message metadata.

## Manual test checklist

- MetaBoost tag appears in generated RSS at channel level.
- Partytime parses `feed.metaBoost` and mapper persists channel value metaBoost rows.
- API responses that include V4V value data include metaBoost fields.
- Web UI shows per-recipient send status and amounts.
- Metadata success: LNAddress invoices include metadata `desc` comment where allowed.
- Metadata failure: modal appears; "Pay Anyway" sends payments with no message metadata.
- Keysend without metaBoost: bLIP-0010 record is attached (TLV 7629169).
- LNAddress without metaBoost: notice shown; payments sent without message metadata.
- `/v4v/boost-messages` page loads and explains requirements.

## Production follow-ups (not implemented)

- Replace hardcoded Alby Sandbox constants with production config.
- Add production-grade error handling and retries.
