---
title: "V4V MetaBoost + LNURL (Local)"
---

# V4V MetaBoost + LNURL (Local)

This guide describes the local, end-to-end workflow for parsing `<podcast:metaBoost>`, storing it,
and sending boost messages with BoostBox + WebLN (Alby or compatible). It also documents the
keysend bLIP-0010 fallback when metaBoost is absent, and the LNAddress behavior when messages are
not enabled.

## Diagram

See `docs/v4v/V4V-METABOOST-FLOW.md`.

## Reference docs

- `podcast:value` spec: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/value.md
- bLIP-0010: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/blip-0010.md
- RSS payment metadata: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/metadata.md
- LNAddress: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/lnaddress.md
- Value slugs: https://github.com/Podcastindex-org/podcast-namespace/blob/b69056b0e86926581bbab426a80a7f9e6e647c1a/docs/examples/value/valueslugs.txt

## Prerequisites

- BoostBox running at `http://localhost:8080`
- Podverse monorepo running locally
- Test assets server running (`npm run dev:test-assets`)
- WebLN-compatible wallet (Alby or similar)

**BoostBox (local):** You can start BoostBox as part of local infra: run `make local_infra_up` (which
includes BoostBox), or build once with `make local_build_boostbox` then `make local_boostbox_up`.
BoostBox lives in a separate repo cloned as a sibling of Podverse; see
[docs/infra/LOCAL-BOOSTBOX.md](../infra/LOCAL-BOOSTBOX.md).

Notes:

- BoostBox is hardcoded to `http://localhost:8080` and expects a dev API key header.
- Alby Sandbox base URL and getalby.com LNURL endpoints are hardcoded in `@podverse/external-services-alby` for development only.

## Supported recipient types

- `type="node"` for keysend (WebLN keysend)
- `type="lnaddress"` for LNAddress (LNURLp -> invoice)

## Alby vs WebLN responsibilities

- `@podverse/external-services-alby` only handles LNURLp lookups and invoice requests for LNAddress payments.
- Keysend is performed through WebLN `keysend` for `type="node"` recipients, not via Alby HTTP APIs.
- WebLN supports both `sendPayment` (invoice-based LNURL) and `keysend`; wallet support for keysend is required.
- When RSS `method="keysend"` and a recipient uses `type="lnaddress"`, the app resolves
  `/.well-known/keysend/<user>` and sends keysend via WebLN using the returned pubkey/custom data.
- The app follows the RSS `method` exactly and does not fall back between keysend and LNURLp invoices.

## MetaBoost tag format

MetaBoost is emitted as a sub-tag of `<podcast:value>`:

```xml
<podcast:value type="lightning" method="keysend" suggested="0.00000005000">
  <podcast:metaBoost schema="boostbox">http://localhost:8080/boost</podcast:metaBoost>
  <podcast:valueRecipient ... />
</podcast:value>
```

Only `schema="boostbox"` is accepted for now.

## Generate test assets (includes metaBoost + LNAddress + keysend)

The test assets generator emits a single hardcoded metaBoost URL and includes both `lnaddress`
and `keysend` recipients for every value-tagged item:

- metaBoost URL: `http://localhost:8080/boost`
- Each value set includes three recipients with splits `60`, `40`, and `1` (fee).
- Placeholder addresses are used for both recipient types.

Commands:

```bash
npm run dev:test-assets
npm run generate -w tools/test-assets -- --add-fake-value-tags
```

## Parse and store metaBoost

1. Parse a feed (via `tools/test-assets` or ingest tooling).
2. Confirm `channel_value_meta_boost` and `item_value_meta_boost` rows exist in the DB.
3. Parsing generated assets is the official “seeding” step for local testing.

## MetaBoost (BoostBox) flow

When `<podcast:metaBoost>` is present, the client must call BoostBox first and use the response
to carry message metadata downstream:

1. POST boost metadata to BoostBox (`POST /boost`).
2. Use the BoostBox `desc` string (`rss::payment::{action} {url} {truncated message}`) for:
   - LNAddress invoice comment (when allowed by LNURL).
   - Keysend bLIP-0010 `message` field (so the payload carries the BoostBox metadata URL).

If BoostBox fails, a modal warns that the message cannot be sent and the user can “Pay Anyway.”
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
disabled **for LNURL invoice flows**. The boost form shows a notice with a “More Info” link to
`/v4v/boost-messages`, and the payment proceeds **without** any message metadata.

## Manual test checklist

- MetaBoost tag appears in generated RSS.
- Partytime parses `value.metaBoost` and mapper persists metaBoost rows.
- API responses that include V4V value data include metaBoost fields.
- Web UI shows per-recipient send status and amounts.
- BoostBox success: LNAddress invoices include BoostBox `desc` comment where allowed.
- BoostBox failure: modal appears; “Pay Anyway” sends payments with no message metadata.
- Keysend without metaBoost: bLIP-0010 record is attached (TLV 7629169).
- LNAddress without metaBoost: notice shown; payments sent without message metadata.
- `/v4v/boost-messages` page loads and explains requirements.

## CORS notes

BoostBox must allow browser requests from the Podverse web app origin. For local development,
ensure `localhost` origins are permitted in BoostBox CORS settings.

## Production follow-ups (not implemented)

- Move BoostBox URL + API key to environment configuration.
- Replace hardcoded Alby Sandbox constants with production config.
- Add production-grade error handling and retries.
