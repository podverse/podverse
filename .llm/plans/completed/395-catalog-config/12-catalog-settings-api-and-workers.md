**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 12 — Catalog settings in the API and the workers

Make the API and the workers read the three catalog settings, through the shared helper plan 10
adds to `@podverse/helpers-config`. This plan adds the config entries, startup validation, env
templates, test env blanks, and docs. It changes no route and no job: later plans use the values.

- Workers need Music off and the allowlist to decide which feeds they add (R52, R55, R66).
- The API needs whether the allowlist is set (the allowlist-only search endpoint, R57; the
  on-demand add refusal, R77) and whether Add by RSS is off (the parse and new-follow refusals,
  R73). The API reads all three settings so it builds the same object as every other reader.

Plan 13 delivers the values in k8s and in local dev from one place for all three apps.

## Rows

R1, R2, R13, R14, R65

## Runs after

10

## Files

- apps/api/src/config/index.ts
- apps/api/src/lib/startup/validation.ts
- apps/api/.env.example
- apps/api/ENV.md
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/src/lib/startup/categoriesForCommand.test.ts
- apps/workers/src/lib/startup/validation.ts
- apps/workers/src/lib/startup/validation.test.ts
- apps/workers/src/config/index.ts
- apps/workers/.env.example
- apps/workers/ENV.md
- packages/helpers-config/src/podverseTestEnv.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **Keys.** API and workers read `CATALOG_MUSIC_DISABLED`, `CATALOG_ADD_BY_RSS_DISABLED`, and
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`: the web keys without `NEXT_PUBLIC_`. Values, blank
  meaning, token rule, and messages are plan 10's; this plan calls
  `buildCatalogConfigFromEnv(env, '')` and `validateCatalogEnv(env, '')` and adds no parsing of
  its own. No size cap (R65).
- **No defaults in config files (R13).** The config entries call the helper with `process.env`.
  No `??`, `||`, or literal. Blank means today's behavior because the switches are negative flags.
- **Invalid is fatal.** An invalid value makes the API and any workers command that reads the
  settings fail startup validation, the same as the web sidecar. Blank never fails.
- **Workers category.** A new `CATEGORY_CATALOG` is added to every command whose categories
  include `CATEGORY_PARSER` or `CATEGORY_PODCAST_INDEX`. Those are the commands that parse a feed
  into the database or look feeds up in Podcast Index, which is where a feed gets added.
  Commands that only enqueue stored feeds (`mqRSSAddAll`, `mqRSSRunDlqConsumer`,
  `devPiBulkFeedsAddFromFile`) are not in it: the parser consumer that takes their messages is.
  A later plan that gates a command outside this rule adds that command to the rule in
  `getCategoriesForCommand` and updates the tests below.
- **Workers read per call.** `getCatalogConfig()` in `apps/workers/src/config/index.ts` builds
  from `process.env` on each call, like the other category getters. Callers do not cache it at
  module scope.
- **API config is a plain mutable field.** `config.catalog` sits on the exported `config`
  object. API integration tests that need a setting on assign a new object and restore the saved
  one in `finally`, the way `account-add-by-rss-convert.integration.test.ts` toggles
  `config.e2e.fixturesEnabled`. Do not add a setter.

## API

### `apps/api/src/config/index.ts`

- Add `CatalogConfig` to the existing `import type { BillingProcessorEnv } from
  '@podverse/helpers-config';` line and `buildCatalogConfigFromEnv` to the existing value import
  of `readBillingProcessorEnv` from the same package.
- In the `Config` type, add directly after the `podcastIndex` block:

```typescript
  /** Instance catalog settings. Blank keys keep today's behavior. */
  catalog: CatalogConfig;
```

- In the `config` value, directly after the `podcastIndex` block:

```typescript
  catalog: buildCatalogConfigFromEnv(process.env, ''),
```

### `apps/api/src/lib/startup/validation.ts`

- Import `validateCatalogEnv` from `@podverse/helpers-config` (merge into the existing import
  that brings in `validateBillingSandboxAllowlistEnv`).
- Directly after the Podcast Index block (after the `PODCAST_INDEX_SEARCH_MAX` push), add:

```typescript
  // Catalog (optional; blank keeps the full directory, Music, and Add by RSS)
  results.push(...validateCatalogEnv(process.env, ''));
```

The existing summary handling treats an invalid result as a failure; no other change.

### `apps/api/.env.example`

Add a section directly after the `##### Podcast Index` section, before
`##### Account / Membership` (same position as the validation push, per
**startup-validation-env-order**). Double-quoted values are not needed for blank keys:

```text
#####
##### Catalog (Optional)
#####
# Keep these equal to the web sidecar NEXT_PUBLIC_CATALOG_* keys. make local_env_setup writes all
# of them from dev/env-overrides/local/catalog.env.
# "true" stops adding music. Stored music stays.
CATALOG_MUSIC_DISABLED=
# "true" refuses Add by RSS parse requests and new Add by RSS follows. Unfollow still works.
CATALOG_ADD_BY_RSS_DISABLED=
# Comma-separated Podcast Index feed ids. When set, only these feeds are added, search lists only
# stored shows on the list, and on-demand Podcast Index adds are refused. Stored shows stay.
CATALOG_PODCAST_INDEX_ID_ALLOWLIST=
```

### `apps/api/ENV.md`

- Under `## Optional Variables`, add a `### Catalog` section directly before `### Add-by-RSS`:
  - One sentence: "Optional instance catalog settings. Each must match the web sidecar key of the
    same name with `NEXT_PUBLIC_` in front; one shared ConfigMap (`podverse-catalog-config`) or
    one local override (`catalog.env`) sets both. They limit what gets added from now on;
    content already stored is served as before."
  - `CATALOG_MUSIC_DISABLED` — `"true"` or `"false"` if set. Blank keeps Music. The API reads
    it for any check a later change adds; workers stop adding music.
  - `CATALOG_ADD_BY_RSS_DISABLED` — `"true"` or `"false"` if set. `"true"` refuses Add by RSS
    parse requests and requests that create a new Add by RSS follow. Unfollow still works.
  - `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` — comma-separated Podcast Index feed ids, no size limit.
    When set, the API refuses the on-demand Podcast Index add, and the allowlist-only search
    endpoint is available. Blank keeps the open directory and the Podcast Index search.
- Under `## Validation Rules` → `### Format Validation`, add one bullet: "**Catalog**:
  `CATALOG_MUSIC_DISABLED` and `CATALOG_ADD_BY_RSS_DISABLED` must be `"true"` or `"false"` if set;
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` must be comma-separated positive integers. An invalid
  value stops the API at startup."

The route behaviors these lines name are added by steps 08, 09, and 11 of this set. Keep the
wording as given.

### Test env — `packages/helpers-config/src/podverseTestEnv.ts`

In `apiTestEnvBase()`, after the four `BILLING_*_ENABLED` blanks, add:

```typescript
  // Blank in every test profile so a developer .env cannot narrow the catalog during tests.
  CATALOG_MUSIC_DISABLED: '',
  CATALOG_ADD_BY_RSS_DISABLED: '',
  CATALOG_PODCAST_INDEX_ID_ALLOWLIST: '',
```

Every API profile (Vitest, web E2E, mobile E2E) then starts with the open catalog. Plan 11's
restricted lane overrides these for its own API process.

## Workers

### `apps/workers/src/lib/startup/categoriesForCommand.ts`

- Add `export const CATEGORY_CATALOG = 'Catalog';` after `CATEGORY_ADD_BY_RSS`, and add
  `| typeof CATEGORY_CATALOG` to the `ConfigCategory` union.
- In `getCategoriesForCommand`, after the Add by RSS check and before `return categories;`:

```typescript
  // Parsing a feed or reading Podcast Index can add a feed, so those commands read the catalog.
  if (categories.has(CATEGORY_PARSER) || categories.has(CATEGORY_PODCAST_INDEX)) {
    categories.add(CATEGORY_CATALOG);
  }
```

### `apps/workers/src/lib/startup/validation.ts`

- Import `CATEGORY_CATALOG` with the other category constants, and `validateCatalogEnv` from
  `@podverse/helpers-config`.
- In `getValidationResultsForCommand`, directly after the `CATEGORY_PODCAST_INDEX` block:

```typescript
  if (categories.has(CATEGORY_CATALOG)) {
    results.push(...validateCatalogEnv(env, ''));
  }
```

### `apps/workers/src/config/index.ts`

Directly after `getPodcastIndexConfig`, add:

```typescript
/** Catalog settings for commands in the Catalog category. Blank keys keep today's behavior. */
export function getCatalogConfig(): CatalogConfig {
  return buildCatalogConfigFromEnv(process.env, '');
}
```

Import `buildCatalogConfigFromEnv` from `@podverse/helpers-config`, and `CatalogConfig` on a
separate `import type` line from the same package.

### `apps/workers/.env.example`

Add a section directly after the `##### Podcast Index` section, before
`##### Message Queue (RabbitMQ)`:

```text
#####
##### Catalog (Optional; parser and Podcast Index commands)
#####
# Keep these equal to the API CATALOG_* keys and the web sidecar NEXT_PUBLIC_CATALOG_* keys.
# "true" stops adding music feeds. Stored music stays.
CATALOG_MUSIC_DISABLED=
# Read by the shared helper; Add by RSS refusals happen in the API.
CATALOG_ADD_BY_RSS_DISABLED=
# Comma-separated Podcast Index feed ids. When set, workers add only these feeds. Stored shows stay.
CATALOG_PODCAST_INDEX_ID_ALLOWLIST=
```

### `apps/workers/ENV.md`

- In `### Command groups and env categories`, append `, Catalog` to the "Categories validated"
  cell of every row whose cell contains `Parser` or `PodcastIndex` (Base + Podcast Index through
  both Full stack rows; not the MQ-only, Image Shrink, Billing, or Base + ORM rows). Leave the
  table unpadded if the new text overflows a column; Prettier is the operator's step. Below the
  table's closing sentence add: "Catalog is added to every command with the Parser or
  PodcastIndex category."
- Add a `## Catalog` section directly after `## Podcast Index`:
  - "Optional. Read by commands that parse feeds or look feeds up in Podcast Index. Keep each
    value equal to the API key of the same name and the web sidecar key with `NEXT_PUBLIC_` in
    front; the shared `podverse-catalog-config` ConfigMap sets them together."
  - `CATALOG_MUSIC_DISABLED` — `"true"` stops workers from adding music feeds. Stored music
    stays.
  - `CATALOG_ADD_BY_RSS_DISABLED` — validated here so the three keys stay consistent; workers
    take no action on it.
  - `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` — comma-separated Podcast Index feed ids, no size
    limit. When set, workers add only these feeds; when a listed id was merged into another
    show, workers add the surviving show. Stored shows stay and keep refreshing as the parser
    decides.
  - "An invalid value fails startup for these commands."

The behavior lines describe step 08's result; keep the wording as given.

## Tests

- `apps/workers/src/lib/startup/categoriesForCommand.test.ts`:
  - Import `CATEGORY_CATALOG`. Every existing expectation for a command that has
    `CATEGORY_PARSER` or `CATEGORY_PODCAST_INDEX` (for example `scheduledJobsRunDue`) gains
    `CATEGORY_CATALOG`. Run through the file and update each one; expectations for commands
    without those categories do not change.
  - Add one test, "adds Catalog to commands that parse feeds or read Podcast Index": `Catalog`
    is in the categories of `mqRSSRunParser`, `mqAddByRSSRunParser`,
    `mqRSSAddTrendingPodcastsFromPodcastIndex`, `podcastIndexDeadFeedsFlagAndMerge`, and
    `mqOpmlImportRun`, and not in `accountSessionPurge`, `mqRSSAddAll`, `mqRSSRunDlqConsumer`,
    or `imageShrinkRunConsumer`.
- `apps/workers/src/lib/startup/validation.test.ts`: add a `describe('Catalog validation')`
  using the file's `snapshotProcessEnv` / `installEnv` / `startupEnv` /
  `expectStartupSucceeds` helpers:
  - `mqRSSRunParser` succeeds with all three `CATALOG_*` keys blank.
  - `mqRSSRunParser` succeeds with `CATALOG_MUSIC_DISABLED: 'true'` and
    `CATALOG_PODCAST_INDEX_ID_ALLOWLIST: '920666,41504'`.
  - `mqRSSRunParser` throws with `CATALOG_MUSIC_DISABLED: 'yes'`, and the error output names
    `CATALOG_MUSIC_DISABLED`.
  - `mqRSSRunParser` throws with `CATALOG_PODCAST_INDEX_ID_ALLOWLIST: '920666,abc'`.
  - `accountSessionPurge` succeeds with `CATALOG_MUSIC_DISABLED: 'yes'` (it does not read the
    catalog).
- `apps/workers/src/lib/startup/k8sEnvContract.test.ts` is not changed here; plan 13 mounts the
  keys and adds the mount check. The existing required-key test keeps passing because blank
  catalog keys are not required.
- API: no new test in this plan. The config entry has no route behavior yet, and the helper's
  parsing and validation are covered by plan 10's `catalogConfig.test.ts`. Steps 08, 09, and 11
  add API integration tests that toggle `config.catalog` for the routes they change.

## Release scratchpad

```markdown
## Instance catalog settings (API and workers)

- Surfaces: api, workers
- Change: the API and workers read optional `CATALOG_MUSIC_DISABLED`,
  `CATALOG_ADD_BY_RSS_DISABLED`, and `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`, the same settings the
  web sidecar reads as `NEXT_PUBLIC_CATALOG_*`. Blank keeps today's behavior. An invalid value
  fails API startup, and fails startup for every workers command that parses feeds or reads
  Podcast Index. No route or job changes behavior from this entry alone.
- Who notices: operators of narrowed self-hosted instances
- Operator steps: none for existing deployments (blank keys)
```
