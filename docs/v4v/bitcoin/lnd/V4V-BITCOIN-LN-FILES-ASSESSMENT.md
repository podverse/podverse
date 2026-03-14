# V4V / Bitcoin Lightning – Files Outside `v4v/bitcoin/lnd/`

All paths below are V4V-related and mention or interact with Bitcoin Lightning / LN in some way, and
are **not** already under a path containing `v4v/bitcoin/lnd/`. Use this list to assess whether any
should be moved under a `v4v/bitcoin/lnd`-style path for separation of concerns.

**Note:** `docs/v4v/bitcoin/lnd/` already contains the Bitcoin LN docs (LOCAL-LIGHTNING, walkthrough,
metaBoost, diagram). This list is for everything else in the repo.

### Shared components (payment-type agnostic)

**Parser-mapping** (`packages/parser-mapping`), **web Boost UI** (`apps/web/src/components/Boost/`), and **API metaboost** (`apps/api` metaboost routes) are shared across payment types; value/compat and Boost UI choose behavior from feed/app data (e.g. Lightning vs future payment types). Bitcoin LN–specific behavior is confined to `@podverse/v4v-btc-ln` and callers that pass LN recipients.

**BoostBox and bLIP-0010:** The BoostBox API request (`@podverse/v4v-metaboost`) and bLIP-0010 keysend metadata (`@podverse/v4v-btc-ln`) share the same semantic fields (action, value*msat, message, app_name, sender*\*, feed/item identifiers). The web app builds both from the same context in `useBoostPayments`; no shared canonical type is required.

---

## 1. Documentation (root / v4v / infra)

| Path                           | Role                                                     | Move under v4v/bitcoin/lnd?              |
| ------------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| `docs/v4v/README.md`           | V4V index; points to bitcoin/lnd and boostbox            | No – keep as index for all payment types |
| `AGENTS.md`                    | References `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md` | No – root doc                            |
| `docs/infra/LOCAL-BOOSTBOX.md` | BoostBox local setup (payment-agnostic)                  | No – general infra                       |

---

## 2. Scripts (LN automation)

| Path                                                   | Role                                     | Move under v4v/bitcoin/lnd?           |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------------- |
| `scripts/v4v/btc/ln/ensure-nigiri-port-override.sh`    | Esplora port override for Nigiri         | **Moved** under `scripts/v4v/btc/ln/` |
| `scripts/v4v/btc/ln/start-nigiri-with-esplora-port.sh` | Start Nigiri with Esplora on 8282        | Same                                  |
| `scripts/v4v/btc/ln/wait-for-lnd.sh`                   | Wait for LND readiness                   | Same                                  |
| `scripts/v4v/btc/ln/provision-regtest.sh`              | Sync chain, fund LND/CLN, open channel   | Same                                  |
| `scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh`   | Fund and connect alice/bob/fee nodes     | Same                                  |
| `scripts/v4v/btc/ln/discover-recipients.sh`            | Write `ln-recipients.local.json`         | Same                                  |
| `scripts/v4v/btc/ln/stop-nigiri-stack.sh`              | Stop Nigiri stack                        | Same                                  |
| `scripts/v4v/btc/ln/lnd-http-proxy.js`                 | LND HTTP proxy (no TLS/macaroon on wire) | Same                                  |

---

## 3. Makefile

| Path                                    | Role                                                                                                                                                                                                             | Move under v4v/bitcoin/lnd?                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `makefiles/local/Makefile.local.v4v.mk` | Targets: `local_ln_up`, `local_ln_down`, `local_ln_clean`, `local_lnd_http_proxy_*`, `local_ln_recipient_nodes_*`; invokes `scripts/v4v/btc/ln/*` and docker compose under `infra/docker/local/v4v/bitcoin/lnd/` | No – single Makefile for all V4V local targets; comment already points to `docs/v4v/bitcoin/lnd/LOCAL-LIGHTNING.md` |

---

## 4. Infra Docker (local)

| Path                                                                       | Role                                                        | Move under v4v/bitcoin/lnd?                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `infra/docker/local/v4v/bitcoin/lnd/lnurl-server/server.js`                | LNURL server (Lightning Address: alice@localhost:3003 etc.) | **Moved** under `infra/docker/local/v4v/bitcoin/lnd/` |
| `infra/docker/local/v4v/bitcoin/lnd/lnurl-server/docker-compose.yml`       | Compose for LNURL server                                    | Same                                                  |
| `infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml` | LND alice/bob/fee recipient nodes                           | Same                                                  |
| `infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/proxy.js`               | HTTP proxy for LND REST (injects macaroon)                  | Same                                                  |
| `infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/docker-compose.yml`     | Compose for LND HTTP proxy                                  | Same                                                  |
| `infra/docker/local/v4v/bitcoin/lnd/lnd-http-proxy/package.json`           | Deps for proxy                                              | Same                                                  |
| `infra/docker/local/boostbox/docker-compose.yml`                           | BoostBox (payment-agnostic)                                 | No – not Bitcoin/LN-specific                          |

---

## 5. Nix

| Path          | Role                                | Move under v4v/bitcoin/lnd?                                                                     |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `nix/v4v.nix` | V4V dev shell: Nigiri + jq          | No – single shell for “V4V dev”; document in bitcoin/lnd that it’s used for Bitcoin LN (Nigiri) |
| `flake.nix`   | Exposes `.#v4v` using `nix/v4v.nix` | No – root flake                                                                                 |

---

## 6. Config / generated data

| Path                                                | Role                                                                              | Move under v4v/bitcoin/lnd?                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `tools/test-assets/config/ln-recipients.local.json` | Generated by `discover-recipients.sh`; consumed by test-asset value-tag generator | No – keep next to test-assets; documented in bitcoin/lnd |

---

## 7. Tools – test assets

| Path                                                | Role                                                                                             | Move under v4v/bitcoin/lnd?                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/test-assets/src/generate-feed-cli.ts`        | CLI entry; calls value-tag logic when `--add-fake-value-tags`                                    | No – test-assets is a general tool; value tags are one option                                                                                                                                                              |
| `tools/test-assets/src/generate-feed-value-tags.ts` | Reads `ln-recipients.local.json`; emits podcast:value / valueRecipient / metaBoost for Lightning | **Assess:** Logic is Bitcoin LN–specific; moving would require a new package or path under e.g. `tools/v4v/bitcoin/lnd/` and refactors. Prefer doc reference only unless you introduce a dedicated “LN test data” package. |
| `tools/test-assets/src/generate-feed-constants.ts`  | Constants for value tags (e.g. metaBoost URL, splits)                                            | Same as above                                                                                                                                                                                                              |
| `tools/test-assets/src/generate-feed-cli-utils.ts`  | Shared CLI utils                                                                                 | No – general                                                                                                                                                                                                               |

---

## 8. Packages – parser-mapping

| Path                                                      | Role                                                                                | Move under v4v/bitcoin/lnd?                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/parser-mapping/src/compat/partytime/value.ts`   | Maps Partytime value/metaBoost/recipients to DB DTOs (lightning-agnostic structure) | No – parser-mapping is shared; value/compat is for any payment type |
| `packages/parser-mapping/src/compat/partytime/channel.ts` | Channel compat; uses value compat                                                   | No – same                                                           |
| `packages/parser-mapping/src/compat/partytime/item.ts`    | Item compat; uses value compat                                                      | No – same                                                           |
| `packages/parser-mapping/src/types/partytime.ts`          | Partytime types (value, valueRecipient, metaBoost)                                  | No – shared types                                                   |

---

## 9. Packages – helpers and external services

| Path                                           | Role                                                                               | Move under v4v/bitcoin/lnd?                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/v4v-metaboost/`                      | metaBoost feed type, BoostBox API types and builders                               | No – payment-agnostic; shared across payment types                        |
| `packages/v4v-helpers/`                        | Recipient split normalization, calculateRecipientAmounts                           | No – payment-agnostic                                                     |
| `packages/v4v-btc-ln/`                         | LNAddress, keysend/blip10, web payments (sendKeysendPayment, sendLnaddressPayment) | **LN-specific;** lives under package name v4v-btc-ln; no path move needed |
| `packages/external-services-alby/src/index.ts` | LNURL details/invoice (Alby); used for LNAddress                                   | No – external service; could support non-LN later                         |

---

## 10. Apps – web (Boost UI and value)

| Path                                                         | Role                                                    | Move under v4v/bitcoin/lnd?                                     |
| ------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/web/src/components/Boost/BoostForm.tsx`                | Boost modal; uses selection, recipients, payments       | No – Boost UI is shared; payment type is chosen from value data |
| `apps/web/src/components/Boost/BoostRecipientStatusList.tsx` | Recipient status list                                   | No – same                                                       |
| `apps/web/src/components/Boost/BoostRecipientInfo.tsx`       | Recipient info display                                  | No – same                                                       |
| `apps/web/src/components/Boost/BoostMetaBoostInfo.tsx`       | MetaBoost info                                          | No – same                                                       |
| `apps/web/src/components/Boost/hooks/useBoostSelection.ts`   | Picks channel/item value and method                     | No – same                                                       |
| `apps/web/src/components/Boost/hooks/useBoostRecipients.ts`  | Builds payment recipients and amounts                   | No – same                                                       |
| `apps/web/src/components/Boost/hooks/useBoostPayments.ts`    | Calls sendKeysendPayment / sendLnaddressPayment (WebLN) | No – same                                                       |
| `apps/web/src/utils/value/webln.ts`                          | WebLN enablement / provider                             | No – shared value utils                                         |
| `apps/web/i18n/originals/en-US.json` (and es, fr, el-GR)     | Copy for Boost/value                                    | No – i18n lives in app                                          |
| `apps/web/i18n/overrides/*.json`                             | Overrides for value/Boost                               | No – same                                                       |

---

## 11. Apps – API

| Path                                             | Role                                          | Move under v4v/bitcoin/lnd?       |
| ------------------------------------------------ | --------------------------------------------- | --------------------------------- |
| `apps/api/src/controllers/metaboost/boostbox.ts` | Proxies to BoostBox /boost (payment-agnostic) | No – metaBoost is not LN-specific |
| `apps/api/src/routes/metaboost.ts`               | Mounts metaboost routes                       | No – same                         |
| `apps/api/src/routes/metaboost/boostbox.ts`      | Boostbox route                                | No – same                         |
| `apps/api/src/app.ts`                            | Mounts metaboost router                       | No – app bootstrap                |
| `apps/api/src/config/index.ts`                   | BoostBox base URL etc.                        | No – config                       |
| `apps/api/src/lib/startup/validation.ts`         | Env validation (may mention boostbox)         | No – startup                      |

---

## 12. LLM / history (session notes)

| Path                                               | Role            | Move under v4v/bitcoin/lnd?   |
| -------------------------------------------------- | --------------- | ----------------------------- |
| `.llm/history/active/boostbox-boosts-bind-mount/*` | Session history | No – history stays under .llm |
| `.llm/history/active/lnd-http-proxy/*`             | Session history | No – same                     |
| `.llm/history/active/v4v-boost-metadata-alby/*`    | Session history | No – same                     |

---

## Summary

- **Already under a “v4v/btc/ln” path:** `scripts/v4v/btc/ln/lnd-http-proxy.js` (and all docs under `docs/v4v/bitcoin/lnd/`).
- **Strong candidates to document only (no move):** Infra Docker, Nix, Makefile, config, parser-mapping, web Boost components, API metaboost, i18n, history. Reason: either shared across payment types, or moving would break build paths / require large refactors.
- **Optional consolidation (scripts):** Move `scripts/ln/*` into `scripts/v4v/btc/ln/` so all Bitcoin LN automation lives under `scripts/v4v/btc/ln/`. Requires updating `makefiles/local/Makefile.local.v4v.mk` and any callers.
- **Done:** `packages/v4v-btc-ln` holds LN-specific logic; `helpers-v4v` was split into `v4v-metaboost` and `v4v-helpers`; `helpers-v4v-web` was removed (code moved into v4v-btc-ln). Test-assets LN value-tag config/constants live in `v4v-btc-ln/test-data`.

Use this list to decide which, if any, moves or new paths you want before changing layout.
