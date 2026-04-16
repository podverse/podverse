# V4V (Value for Value)

V4V is a broad feature that supports multiple payment types. Documentation is grouped by payment
implementation.

## Payment types

- **Bitcoin / Lightning (LND):** [bitcoin/lnd/](bitcoin/lnd/) — local Nigiri setup, LNAddress,
  keysend, metaBoost flow, and full setup diagram.
- **Podverse public RSS asset (mb1 integration/testing):**
  `apps/web/public/feeds/podverse-boosts-feed.xml` (served at `/feeds/podverse-boosts-feed.xml`).
- **MB1 confirm-payment signaling:** Podverse web boost flow posts recipient-level
  `recipient_outcomes` (type/address/split/name/custom_key/custom_value/fee/status) to the
  confirmation endpoint returned by mb1 boost metadata, with legacy boolean fallback for older
  endpoints.
