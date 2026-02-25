# Feature: v4v-boost-metadata-alby (Part 3)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 31, create
> `v4v-boost-metadata-alby-part-04.md`.

## Metadata

- Started: 2026-02-18
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/47
- Branch: feature/v4v-boost-metadata-alby
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 26 - 2026-02-24

#### Prompt (Developer)

the Cancel button should not be disabled on this screen, as now i'm stuck

#### Key Decisions

- Keep the Boost modal Cancel button enabled during submission.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx

# Feature: v4v-boost-metadata-alby (Part 3)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 31, create `v4v-boost-metadata-alby-part-04.md`.

## Metadata

- Started: 2026-02-18
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/47
- Branch: feature/v4v-boost-metadata-alby
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 26 - 2026-02-18

#### Prompt (Developer)

Fix Remaining Build Errors

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Remove remaining .js suffix from appValue import for Next.js resolution.
- Build/type-check commands require a local npm binary; deferred until available.
- Type the calculated recipients as `RecipientAmount` to match helpers-v4v output.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostRecipients.ts

### Session 27 - 2026-02-23

#### Prompt (Developer)

does the alby web extension support regtest testing? investigate. the
@podverse/docs/v4v/LOCAL-V4V-TESTNET-WALKTHROUGH.md says it doesn't but it was made by ChatGPT and i
don't trust it.

#### Prompt (Developer)

rewrite the plan with the correct steps i can take to test transactions to our regtest local network

#### Key Decisions

- Investigated Alby extension source (`lnd.ts`, `ConnectLnd/index.tsx`): the LND connector accepts any
  URL + macaroon hex with no network-type restriction. The doc claim "Alby does not support regtest" was
  incorrect.
- The Alby `ConnectLnd` UI accepts `http://` URLs (pattern `https?://.+`) and supports drag-and-drop of
  `.macaroon` files, so connecting to Nigiri's local LND REST at `http://localhost:18080` is fully
  supported.
- Browser extension background scripts are not subject to the same mixed-content/CORS restrictions as
  web pages, so HTTP to localhost works from the extension context.
- Rewrote the wallet section of both docs with concrete Alby + regtest steps including OS-specific
  `xxd` commands for the macaroon.

#### Files Modified

- docs/v4v/LOCAL-V4V-TESTNET-WALKTHROUGH.md (session 27)
- docs/infra/LOCAL-LIGHTNING.md (session 27)

### Session 28 - 2026-02-23

#### Prompt (Developer)

i tried copy and pasting the string, then i tried to drag and drop the file itself. i still get this error

#### Prompt (Developer)

update

#### Key Decisions

- "Connection failed (Bad Request)" (HTTP 400) was caused by using `http://` against LND's REST API,
  which only serves HTTPS. Go's net/http TLS server returns exactly HTTP 400 "Client sent an HTTP
  request to an HTTPS server" when it receives a plain HTTP connection on a TLS port. This affects both
  hex paste and file drag-drop equally (the URL is what's wrong, not the macaroon).
- Fix: use `https://localhost:18080`. Chrome must first accept LND's self-signed cert via
  `https://localhost:18080/v1/getinfo` → Advanced → Proceed; the extension background script uses the
  same trust store.
- Also corrected `xxd` command to use `| tr -d '\n'` (no `-c 256`) so the hex output is always a
  single unbroken line regardless of macaroon length.

#### Files Modified

- docs/v4v/LOCAL-V4V-TESTNET-WALKTHROUGH.md
- docs/infra/LOCAL-LIGHTNING.md

### Session 29 - 2026-02-23

#### Prompt (Developer)

debug [screenshot: Alby "Failed to fetch" with https://localhost:18080]

#### Prompt (Developer)

update

#### Key Decisions

- "Failed to fetch" with https:// means the Chrome extension service worker rejects the self-signed TLS
  cert. Unlike browser tabs, extension service workers do not inherit browser "Proceed anyway" exceptions.
- `no-rest-tls=1` with `restlisten=0.0.0.0` is rejected by LND (security check). `restlisten=127.0.0.1`
  allows `no-rest-tls` but Docker Desktop on macOS cannot forward ports to container loopback — confirmed
  via curl exit code 56.
- Chosen fix: add LND's self-signed TLS cert to the macOS login keychain as a trusted root. Chrome on
  macOS uses the macOS keychain (including for extension service workers), so this makes the cert trusted
  system-wide. The cert regenerates on `make local_ln_clean`, so Makefile.local.v4v now runs
  `security add-trusted-cert` automatically on macOS after each `make local_ln_up`.

#### Files Modified

- Makefile.local.v4v
- docs/v4v/LOCAL-V4V-TESTNET-WALKTHROUGH.md
- docs/infra/LOCAL-LIGHTNING.md

### Session 30 - 2026-02-24

#### Prompt (Developer)

Fix LN Credential Reliability

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `--lnddir=/data/.lnd` for alice/bob/fee recipient LND services so credential artifacts are written into the shared mounted volume path deterministically.
- Switched LNURL server default Nigiri credential mount from per-file binds to a single directory bind (`.../volumes/lnd:/lnd-creds:ro`) and updated `LND_MACAROON_PATH` to `/lnd-creds/data/chain/bitcoin/regtest/admin.macaroon` to avoid file-vs-directory bind ambiguity.
- Reordered `local_ln_up` to start the LNURL server only after recipient provisioning/discovery and always with the OS-specific `NIGIRI_LND_CREDENTIALS_PATH` export.
- Added `local_ln_verify_recipient_creds` make target and enforced it in `local_ln_up` before readiness output, failing fast when alice/bob/fee credential files are missing.
- Updated LOCAL-LIGHTNING docs with the new startup behavior and troubleshooting command (`make local_ln_verify_recipient_creds`).

#### Files Modified

- .llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-03.md
- infra/docker/local/v4v/bitcoin/lnd/ln-recipient-nodes/docker-compose.yml
- infra/docker/local/v4v/bitcoin/lnd/lnurl-server/docker-compose.yml
- Makefile.local.v4v
- docs/v4v/bitcoin/lnd/LOCAL-LIGHTNING.md

### Session 31 - 2026-02-24

#### Prompt (Developer)

review the docs/v4v/bitcoin/lnd and docs/v4v/boostbox docs for alignment with the monorepo. if
anything is out of date, update it. if anything seems redundant to you, then propose to remove or
consolidate it.

V4V docs alignment

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file
itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Align test-asset docs with mixed per-recipient LN types and current metaBoost attributes.
- Consolidate Boostbox auth options into the registry spec and remove the standalone file.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/bitcoin/lnd/LOCAL-LIGHTNING.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/bitcoin/lnd/LOCAL-V4V-TESTNET-WALKTHROUGH.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/bitcoin/lnd/V4V-BITCOIN-LN-SETUP-DIAGRAM.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/boostbox/BOOSTBOX-REGISTRY-SPEC.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/boostbox/BOOSTBOX-AUTH-OPTIONS.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/README.md

### Session 32 - 2026-02-24

#### Prompt (Developer)

make the code changes

#### Key Decisions

- Use RSS-parsed `metaBoost.node` for BoostBox base URL instead of a hard-coded localhost value.
- Throw a clear error when BoostBox schema is present but the metaBoost node is missing.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostPayments.ts
