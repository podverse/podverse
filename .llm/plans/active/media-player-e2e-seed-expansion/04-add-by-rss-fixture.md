# Step 4 — Add-by-RSS fixture

## Goal

Seed two add-by-RSS resources for the existing E2E user — one with a
persisted `playback_position` and one without — so the add-by-RSS
resume spec can verify both branches of matrix § 1's add-by-RSS row
and the play / pause / 15-second save cadence from matrix § 6.

## Scope

- DB inserts in [`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs)
  for two `add_by_rss_resource_data` rows (and any related encryption
  / credential row required by the API persistence path).
- Spec edit to lift
  [`media-player-addbyrss-resume.spec.ts`](../../../apps/web/e2e/media-player-addbyrss-resume.spec.ts)
  out of `test.fixme()`.
- Pre-flight environment verification that
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is set in the E2E API env;
  no new env var introduced.

## Deliverables

### 1. Pre-flight env verification

Confirm `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is already wired for
E2E. The env should be present in:

- [`apps/api/.env.example`](../../../apps/api/.env.example)
- One of the test setup files under [`apps/api/src/test/`](../../../apps/api/src/test/)
- `infra/config/env-templates/api.env.example` if API test env is
  templated there.

If the var is missing from any of these, add it with a clearly
test-only value rather than changing production defaults. Document the
finding in the commit message.

### 2. Seed inserts in `tools/web/seed-e2e.mjs`

Append below the music block from step 3. The exact table column set
must be verified against the current entity:

```bash
rg -n "AddByRSSResourceData|add_by_rss_resource_data" \
  packages/orm/src apps/api/src
```

Insert in dependency order:

1. Two `add_by_rss_resource_data` rows linked to the existing E2E
   user (`e2e-user@example.com`, `accountId` captured earlier in the
   seed script):
   - **with-position resource**: `id_text =
     E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT`,
     `feed_url = E2E_ADD_BY_RSS_FEED_URL`,
     `playback_position = E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 42`,
     `is_add_by_rss_redacted = false`, plus a deterministic
     `enclosure_url` such as
     `'https://e2e-seed-addbyrss.example/with-position.mp3'`.
     **Title and any other display fields**: use stable strings so the
     spec can target the row by text if needed.
   - **fresh resource**: same shape with
     `id_text = E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT`,
     `playback_position = NULL` (or whatever sentinel the column uses
     when no playback has been recorded — verify during step 4),
     `enclosure_url =
     'https://e2e-seed-addbyrss.example/fresh.mp3'`.

2. If the schema requires an `add_by_rss_credentials` row (or
   similar) with encrypted feed credentials, insert one. Use a test
   sentinel value (e.g. a fixed encrypted blob produced with the
   test encryption key). Document the encryption mechanics in the
   commit message so a future reader can regenerate the blob if the
   key rotates.

3. The matrix flags add-by-RSS resources as **skipped for stats
   tracking** (`if (!loggedInAccountRef.current ||
   mpAddByRSSRef.current) return`). The seed does not need any
   stats-related rows.

The two inserts must remain idempotent across reruns. Use
`DELETE FROM add_by_rss_resource_data WHERE id_text IN (...)` before
the inserts, matching the existing livestream block's pattern.

### 3. Spec lift — `media-player-addbyrss-resume.spec.ts`

Replace `test.fixme()` with two test branches:

- **Resume from stored position** (matrix § 1 add-by-RSS row,
  `addByRSSSeekToTime !== null && >= 0` case): authenticate as the
  E2E user; navigate to the with-position add-by-RSS resource; click
  play; assert seek to
  `E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 42` on
  `loadedmetadata`. Assert stats tracking is **not** invoked (per the
  add-by-RSS skip rule).
- **No stored position seeks to 0**: same auth/setup with the fresh
  resource; assert seek to `0` on `loadedmetadata`.

If the spec wants to additionally verify the 15-second save cadence
from matrix § 6, do it as a follow-up — the resume cells alone are the
matrix-mandated coverage and adding the cadence assertion increases
spec runtime without changing the matrix-cell guarantee.

### 4. Constants imported via seedConstants helper

Spec imports `E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT`,
`E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT`, and the position constant
from `apps/web/e2e/helpers/seedConstants.ts`.

## Out of scope

- Adding new add-by-RSS feature paths (URL discovery, OPML import,
  credentials editing). The spec asserts existing matrix behavior on
  already-persisted resources.
- Testing the redacted (`is_add_by_rss_redacted = true`) branch from
  matrix § 3. That row is documented as "skipped" in the queue load
  path and the existing fixme'd spec does not target it; if a future
  spec needs it, add it on a separate commit.
- Stats-tracking assertions beyond the negative ("stats are not
  called for add-by-RSS"). Stats tracking is owned by an unrelated
  test surface.

## Exit criteria

- `make e2e_seed_web` succeeds and remains idempotent (run twice in
  sequence).
- `make e2e_test_web_report_spec
  SPEC=e2e/media-player-addbyrss-resume.spec.ts` passes both
  branches.
- The previously fixme'd add-by-RSS spec no longer contains
  `test.fixme()` in source.
- `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is documented in the
  commit message as already-present, or has been added to the
  appropriate `.env.example` file with a test sentinel.

## Verification commands

```bash
make test_deps
make e2e_seed_web
make e2e_seed_web   # idempotency
make e2e_test_web_report_spec SPEC=e2e/media-player-addbyrss-resume.spec.ts
```
