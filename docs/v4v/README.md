# V4V (Value for Value)

V4V is a broad feature that supports multiple payment types. Documentation is grouped by payment
implementation.

## Payment types

- **Bitcoin / Lightning (LND):** [bitcoin/lnd/](bitcoin/lnd/) — local Nigiri setup, LNAddress,
  keysend, metaBoost flow, and full setup diagram.
- **Donate (`/donate`) vs channel/item MetaBoost:** The **Donate** app flow uses MetaBoost **mb-v1** only, not
  mbrss-v1; mbrss-v1 applies to channel/item boosts. See `apps/web/ENV.md` for `NEXT_PUBLIC_APP_VALUE_METABOOST_*` on `/donate`.
- **mbrss-v1 boost messages:** After split payments, Podverse posts one mbrss-v1 boost to the channel’s
  `metaBoost` URL once the largest split recipient’s payment succeeds.
