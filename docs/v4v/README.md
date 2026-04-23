# V4V (Value for Value)

V4V is a broad feature that supports multiple payment types. Documentation is grouped by payment
implementation.

## Payment types

- **Bitcoin / Lightning (LND):** [bitcoin/lnd/](bitcoin/lnd/) — local Nigiri setup, LNAddress,
  keysend, metaBoost flow, and full setup diagram.
- **Podverse public RSS asset (mbrss-v1 integration/testing):**
  `apps/web/public/feeds/podverse-boosts-feed.xml` (served at `/feeds/podverse-boosts-feed.xml`).
- **mbrss-v1 boost messages:** After split payments, Podverse posts one mbrss-v1 boost to the channel’s
  `metaBoost` URL once the largest split recipient’s payment succeeds.
