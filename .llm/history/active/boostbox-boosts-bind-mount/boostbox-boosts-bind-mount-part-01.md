### Session 1 - 2026-02-23

#### Prompt (Developer)

fix the mount

#### Key Decisions

- Switch Boostbox boosts storage to a host bind mount for local visibility.

#### Files Modified

- infra/docker/local/boostbox/docker-compose.yml

### Session 2 - 2026-02-23

#### Prompt (Agent)

Add LN Recipient Nodes (alice, bob, fee)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Created three dedicated LND recipient containers (alice/bob/fee) using `lightninglabs/lnd:v0.19.3-beta` (same as Nigiri's main LND) connecting to Nigiri's Bitcoin Core via `host.docker.internal` with ZMQ (admin1/123 credentials, ports 28332/28333 exposed on host).
- Recipient nodes are keysend targets only; the main Nigiri LND (the Alby sender wallet) is never listed as a recipient, eliminating "self-payments not allowed".
- `discover-recipients.sh` now reads pubkeys from the three recipient containers instead of the main LND node.
- `provision-ln-recipient-nodes.sh` is idempotent: skips funding/channeling if already done.
- `local_ln_up` wires in recipient node startup and provisioning before running `discover-recipients.sh`.

#### Files Modified

- infra/docker/local/ln-recipient-nodes/docker-compose.yml (new)
- scripts/ln/provision-ln-recipient-nodes.sh (new)
- scripts/ln/discover-recipients.sh
- Makefile.local.v4v

### Session 3 - 2026-02-23

#### Prompt (Developer)

add the accept-keysend as needed

#### Key Decisions

- Added `--accept-keysend` to the `x-lnd-common` anchor and all three per-service command blocks so recipient nodes accept spontaneous keysend payments.

#### Files Modified

- infra/docker/local/ln-recipient-nodes/docker-compose.yml

### Session 4 - 2026-02-23

#### Prompt (Agent)

LNAddress Local End-to-End Plan

Implement the plan as specified, it is attached for your reference.

#### Key Decisions

- LNURL server now routes per-username: alice/bob/fee → their own LND REST endpoints (reachable by container name on `podverse_local_network`); unknown usernames fall back to main Nigiri LND.
- Named Docker volumes from ln-recipient-nodes compose are mounted read-only into the LNURL server container to provide macaroons and TLS certs for each node.
- CORS headers added to LNURL server so browser at `localhost:3000` can fetch directly without CORS errors.
- `fetchLnurlDetails` and `fetchLnurlInvoice` in `external-services-alby` now detect localhost addresses and bypass `api.getalby.com`, resolving directly via `.well-known/lnurlp/` (LUD-06 flow).
- `lightning_lnaddress` i18n key added to all 4 originals and 3 override files so the BoostForm tab renders "Bitcoin LNAddress".
- No new LND nodes required; alice/bob/fee serve dual purpose (keysend + LNAddress).

#### Files Modified

- infra/docker/local/lnurl-server/server.js
- infra/docker/local/lnurl-server/docker-compose.yml
- packages/external-services-alby/src/index.ts
- apps/web/i18n/originals/en-US.json
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/i18n/overrides/el-GR.json
