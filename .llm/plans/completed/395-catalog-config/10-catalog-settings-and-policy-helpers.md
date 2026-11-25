**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 10 — Catalog settings: shared parsing, web wiring, and web docs

Add three optional settings that let an operator narrow what an instance adds and offers: Music
off, Add by RSS off, and a Podcast Index id allowlist. This plan adds the shared parsing and
validation helper that the web app, its runtime-config sidecar, the API, and the workers all use,
wires the web side (runtime config, sidecar validation, the `public.catalog` block), adds the one
web helper module later plans import, and documents the web keys. It changes no screen.

Plan 12 wires the same helper into the API and the workers. Plan 13 delivers the values to all
three apps from one place (k8s and local env). Mobile code does not change.

What the settings do across the whole set, so the docs here say it the same way:

- The allowlist and Music off limit what gets **added** from now on: which feeds workers add and
  which feeds an on-demand add accepts. Content already stored keeps every page, row, embed, and
  playback.
- Music off also hides music navigation, chips, and search facets on web.
- Add by RSS off hides every Add by RSS entry point on web, makes `/add-by-rss` not found, and the
  API refuses Add by RSS parse requests and new Add by RSS follows (unfollow still works).
- With the allowlist set, search lists only stored allowlisted shows, and the Podcast Index Add
  Feed button and its on-demand add are off.

## Rows

R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R65

## Runs after

none

## Files

- packages/helpers-config/src/catalogConfig.ts
- packages/helpers-config/src/catalogConfig.test.ts
- packages/helpers-config/src/index.ts
- apps/web/src/config/runtime-config.ts
- apps/web/src/config/index.ts
- apps/web/sidecar/src/server.ts
- apps/web/src/lib/catalog/catalogPolicy.ts
- apps/web/sidecar/.env.example
- apps/web/ENV.md
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

| Setting | API and workers key | Web key | Blank or unset | Set |
| --- | --- | --- | --- | --- |
| Music off | `CATALOG_MUSIC_DISABLED` | `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED` | Music on (today) | `true` turns Music off; `false` keeps it on |
| Add by RSS off | `CATALOG_ADD_BY_RSS_DISABLED` | `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED` | Add by RSS on (today) | `true` turns Add by RSS off; `false` keeps it on |
| Allowlist | `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` | `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` | No allowlist (full directory) | Comma-separated Podcast Index feed ids (`feed.podcast_index_id`) |

- One helper, two key prefixes. API and workers read the unprefixed keys; the web app and its
  sidecar read the `NEXT_PUBLIC_` keys. Plan 13 feeds both from one ConfigMap (k8s) and one
  override file (local), so an operator sets each value once.
- The two switches are negative flags, so blank means today's site with no default value anywhere
  in code (R2, R13, R14). Nothing in any `config/index.ts` supplies a fallback, and the templates
  ship the keys blank.
- There is no medium switch and no `NEXT_PUBLIC_FEATURES_ENABLED_MEDIUMS` key (R4).
- The allowlist holds Podcast Index numeric ids only. It is never Podverse `id_text` and never a
  URL to a remote document (R5, R6, R7).
- A feed with no Podcast Index id (null, undefined, or 0) is outside the list whenever the
  allowlist is set (R8). Plans that compare ids (workers, API, search) apply this rule.
- No size cap on the allowlist (R65). Do not add a maximum count, a length check, or a truncation
  anywhere in this plan.
- Allowlist separators are commas; whitespace around or between tokens is also accepted
  (`/[\s,]+/`, the same split as `parseDelimitedList` in `apps/web/src/lib/mobileAppLinks.ts`).
- A valid token is a positive base-10 integer with no sign, no decimal point, and no leading zero
  (`/^[1-9]\d*$/`) that is also `Number.isSafeInteger`. Duplicates are dropped; first-seen order
  is kept.
- An invalid value for any of the three keys is fatal at startup in every app that reads it: the
  result is `isValid: false, isRequired: true`. The web sidecar exits (precedent:
  `validateIntegrationsWebAnalytics` in `apps/web/sidecar/src/server.ts`); plan 12 makes the API
  and the workers fail the same way. Silently ignoring a typo could add music or shows the
  operator turned off.
- When the allowlist is set but parses to no valid id (only reachable when a process skipped
  validation), the parsed list is `[]` and every feed is outside the list. That fails closed.
- Config field names are positive so callers read naturally: `musicEnabled`, `addByRSSEnabled`,
  `podcastIndexIdAllowlist`.
- Changing a value takes effect when the process restarts, with no image rebuild. The web server
  caches the sidecar response per process (`fetchWebRuntimeConfigFromSidecar` in
  `apps/web/src/config/runtime-config.server.ts`).

## Shared helper — `packages/helpers-config/src/catalogConfig.ts` (new)

Every reader needs the same parsing: the web sidecar (Tier A, cannot import `apps/web/src`),
`apps/web/src/config/index.ts`, the API config, and the workers config. It lives in
`@podverse/helpers-config`, which all four already depend on. Relative imports use `.js`
specifiers (Tier A). The env-argument style matches `validateBillingSandboxAllowlistEnv` in
`billingProcessorEnv.ts`, so callers pass `process.env` or a test object.

Exports, exactly:

```typescript
import type { ValidationResult } from '@podverse/helpers';

type EnvSource = Record<string, string | undefined>;

export type CatalogConfig = {
  /** False when `<prefix>CATALOG_MUSIC_DISABLED` is `true`. */
  musicEnabled: boolean;
  /** False when `<prefix>CATALOG_ADD_BY_RSS_DISABLED` is `true`. */
  addByRSSEnabled: boolean;
  /** Null when no allowlist is set. Otherwise the Podcast Index feed ids the instance adds. */
  podcastIndexIdAllowlist: readonly number[] | null;
};

/** `''` for the API and the workers; `'NEXT_PUBLIC_'` for the web app and its sidecar. */
export type CatalogEnvKeyPrefix = '' | 'NEXT_PUBLIC_';

export const CATALOG_VALIDATION_CATEGORY = 'Catalog';

export function parseCatalogPodcastIndexIdAllowlist(raw: string | undefined): number[] | null;
export function buildCatalogConfigFromEnv(env: EnvSource, prefix: CatalogEnvKeyPrefix): CatalogConfig;
export function validateCatalogDisabledFlag(env: EnvSource, key: string): ValidationResult;
export function validateCatalogPodcastIndexIdAllowlist(env: EnvSource, key: string): ValidationResult;
export function validateCatalogEnv(env: EnvSource, prefix: CatalogEnvKeyPrefix): ValidationResult[];
```

`ValidationResult` comes from `@podverse/helpers`, the same source `startupValidation.ts` uses.
`EnvSource` stays module-local, as in `billingProcessorEnv.ts`.

Behavior:

- `parseCatalogPodcastIndexIdAllowlist`: `undefined`, empty, or whitespace-only returns `null`.
  Otherwise split on `/[\s,]+/`, drop empty tokens, keep tokens that pass the valid-token rule,
  dedupe keeping first-seen order, and return the array (possibly `[]`). No cap.
- `buildCatalogConfigFromEnv(env, prefix)`:

```typescript
return {
  musicEnabled: env[`${prefix}CATALOG_MUSIC_DISABLED`]?.trim() !== 'true',
  addByRSSEnabled: env[`${prefix}CATALOG_ADD_BY_RSS_DISABLED`]?.trim() !== 'true',
  podcastIndexIdAllowlist: parseCatalogPodcastIndexIdAllowlist(
    env[`${prefix}CATALOG_PODCAST_INDEX_ID_ALLOWLIST`]
  ),
};
```

- `validateCatalogDisabledFlag(env, key)` reads `env[key]`. Category is
  `CATALOG_VALIDATION_CATEGORY` and `name` is `key` in every result:
  - unset or blank → `{ isSet: false, isValid: true, isRequired: false, message: 'Blank (on)' }`
  - `true` → `{ isSet: true, isValid: true, isRequired: false, message: 'Set to true (off)' }`
  - `false` → `{ isSet: true, isValid: true, isRequired: false, message: 'Set to false (on)' }`
  - anything else (compared after `trim()`, case-sensitive, matching the other web booleans) →
    `{ isSet: true, isValid: false, isRequired: true, message: 'Invalid value: "<raw>" - must be "true" or "false"' }`
- `validateCatalogPodcastIndexIdAllowlist(env, key)` reads `env[key]`:
  - unset or blank → `{ isSet: false, isValid: true, isRequired: false, message: 'Blank (no allowlist)' }`
  - set, and every non-empty token is valid → `{ isSet: true, isValid: true, isRequired: false, message: '<n> Podcast Index id(s)' }` where n is the deduped count
  - set, with one or more invalid tokens → `{ isSet: true, isValid: false, isRequired: true, message: 'Invalid Podcast Index id(s): <tok>, <tok> - use comma-separated positive integers' }`
  - set, but no tokens after splitting (for example `","`) → `{ isSet: true, isValid: false, isRequired: true, message: 'Empty after parsing - use comma-separated positive integers' }`
- `validateCatalogEnv(env, prefix)` returns, in this order, the disabled-flag result for
  `<prefix>CATALOG_MUSIC_DISABLED`, the disabled-flag result for
  `<prefix>CATALOG_ADD_BY_RSS_DISABLED`, and the allowlist result for
  `<prefix>CATALOG_PODCAST_INDEX_ID_ALLOWLIST`. The API and the workers call this (plan 12); the
  sidecar calls the two per-key validators because it validates one key at a time.

Add `export * from './catalogConfig.js';` to `packages/helpers-config/src/index.ts` in
alphabetical position (after `billingProcessorEnv.js`).

## Runtime config keys — `apps/web/src/config/runtime-config.ts`

- Add the three `NEXT_PUBLIC_CATALOG_*` keys to the `WebRuntimeConfigEnvKey` union, next to
  `NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES`.
- Add the three keys to `webRuntimeConfigEnvKeys.optional` (never `required`; unset must work).
- `runtime-config-store.ts` needs no edit: `buildRuntimeConfigFromProcessEnv` reads every key in
  the two lists, and `applyWebRuntimeEnvDefaults` must not gain defaults for these keys.

## Public config block — `apps/web/src/config/index.ts`

- Import `buildCatalogConfigFromEnv` from `@podverse/helpers-config` (the file already imports
  `optionalEnvString` from there; merge into that import).
- Add `catalog: buildCatalogConfigFromEnv(env, 'NEXT_PUBLIC_'),` inside `public`, directly after
  the `features` block (R9). No `??`, `||`, or literal fallback (R13). If `env`'s type is not
  assignable to `Record<string, string | undefined>`, widen the helper's parameter type in
  `catalogConfig.ts` rather than casting here.
- Replace the first-line eslint comment text "env vars validated at build time in
  scripts/validate-env.ts" with "env vars validated by the runtime-config sidecar
  (sidecar/src/server.ts)". `scripts/validate-env.ts` validates only `RUNTIME_CONFIG_URL` and
  server-process keys; the sidecar validates every `NEXT_PUBLIC_*` key.

The resulting type is `WebConfig['public']['catalog']`, which equals `CatalogConfig`.

## Sidecar — `apps/web/sidecar/src/server.ts`

- Add the three `NEXT_PUBLIC_CATALOG_*` keys to `optionalKeys` (keep the list's alphabetical
  order: after `NEXT_PUBLIC_BRAND_THEME_COLOR`, before `NEXT_PUBLIC_CONTACT_EMAIL`). `allKeys` and
  `buildRuntimeConfig` then serve them on `/runtime-config` (R11).
- Import `validateCatalogDisabledFlag` and `validateCatalogPodcastIndexIdAllowlist` in the existing
  `@podverse/helpers-config` import block.
- In `validateOne`, before the final `if (isRequired)`:

```typescript
if (
  key === 'NEXT_PUBLIC_CATALOG_MUSIC_DISABLED' ||
  key === 'NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED'
) {
  return validateCatalogDisabledFlag(process.env, key);
}
if (key === 'NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST') {
  return validateCatalogPodcastIndexIdAllowlist(process.env, key);
}
```

- In `getCategory`, map all three keys to `'Catalog'`.
- `findMissingRequiredKeys` is unchanged (presence check for required keys only).

In k8s the sidecar receives these keys from the shared catalog ConfigMap with an envFrom
`prefix: NEXT_PUBLIC_` (plan 13), so `infra/k8s/base/web/source/web-sidecar.env` does not list
them. Do not add them there.

## Web helper module — `apps/web/src/lib/catalog/catalogPolicy.ts` (new)

The one module web plans import for server-side reads. Tier B: extensionless relative imports.

```typescript
import type { CatalogConfig } from '@podverse/helpers-config';

import { getConfig } from '../../config';

/** Server components, route handlers, and metadata: read per request, never at module scope. */
export const getCatalogConfig = (): CatalogConfig => getConfig().public.catalog;
```

Keep it to that one export. There are no allowlist predicates on web: no page, embed, or list
asks whether a stored show is on the list (R61–R64). Step 09's search work compares ids on the
API side.

Booleans are read straight from the object; do not add wrapper functions for them:

- Music on: `catalog.musicEnabled`
- Add by RSS on: `catalog.addByRSSEnabled`
- Allowlist set: `catalog.podcastIndexIdAllowlist !== null`

How each kind of component gets the object:

- Server components, `generateMetadata`, route handlers: `getCatalogConfig()` inside the function
  body. Never read it from a module-level config value such as `staticConfig` in
  `apps/web/src/app/layout.tsx`, which is evaluated at build time.
- Client components: `useConfig().public.catalog` (`apps/web/src/contexts/Config.tsx`). The root
  layout passes request-time `getConfig()` into `ConfigProvider`, so this matches the server
  render and hydrates without a mismatch.

## Sidecar env template — `apps/web/sidecar/.env.example` (R14)

Add a section after `##### Website Features` and its two keys:

```text
#####
##### Catalog (Optional)
#####
# Keep these equal to the API and workers CATALOG_* keys. make local_env_setup writes all of them
# from dev/env-overrides/local/catalog.env.
# Blank keeps Music. "true" stops adding music and hides music navigation; stored music pages stay.
NEXT_PUBLIC_CATALOG_MUSIC_DISABLED=
# Blank keeps Add by RSS. "true" hides Add by RSS and /add-by-rss is not found.
NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED=
# Blank adds from the full directory. Comma-separated Podcast Index feed ids (not Podverse ids)
# limit which shows get added and what search lists; stored shows keep their pages.
NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST=
```

Plan 13 owns every other template and the local override. Not edited, on purpose:
`tools/web-perf/lighthouse/.env.web*` and `tools/web-perf/bundle-analyzer/src/env-config.ts`
(unset keys give the full site), and `apps/web/playwright.e2e-server-env.ts` (plan 11 owns it).

## Docs — `apps/web/ENV.md` (R12)

- Under `### Web Configuration` (the section that lists `NEXT_PUBLIC_WEB_PROTOCOL` and
  `NEXT_PUBLIC_WEB_DOMAIN`), add after those two bullets:

  - A sentence: "The catalog keys below narrow what this instance adds and offers. Each is
    optional and works alone; leave all three blank for the full site. They limit what gets
    added from now on: content already stored keeps its pages, rows, embeds, and playback. Keep
    each value equal to the API and workers `CATALOG_*` key of the same name; one shared
    ConfigMap (`podverse-catalog-config`) or one local override (`catalog.env`) sets all of them.
    A change takes effect when the web server restarts, with no rebuild."
  - **`NEXT_PUBLIC_CATALOG_MUSIC_DISABLED`** (Optional) — `"true"` or `"false"` if set. Blank
    keeps Music. `"true"` stops workers from adding music, and hides music from navigation,
    media chips, and search facets. Stored artists, albums, tracks, and music livestreams keep
    their pages, rows, embeds, and playback. Podcast clips and podcast livestreams are
    unaffected.
  - **`NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED`** (Optional) — `"true"` or `"false"` if set.
    Blank keeps Add by RSS. `"true"` hides every way to add an Add by RSS feed, every
    `/add-by-rss` URL returns not found, and the API refuses Add by RSS parse requests and new
    Add by RSS follows. Saved Add by RSS rows can still be removed.
  - **`NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST`** (Optional) — comma-separated Podcast
    Index feed ids (the numeric Podcast Index id, not the Podverse id in `/podcast/<id>`). Blank
    adds from the full directory. When set, workers add only these feeds, search lists only
    stored shows on the list, and the Podcast Index Add Feed button and its on-demand add are
    off. Shows already stored keep their pages, episodes, clips, chapters, livestreams, and
    embeds. A feed with no Podcast Index id is outside the list. There is no size limit.
    Example: `"920666,41504"`.
- Under `## Value Rules` → `### Format Validation`, add one bullet: "**Catalog**: the two
  `NEXT_PUBLIC_CATALOG_*_DISABLED` keys must be `"true"` or `"false"` if set, and
  `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` must be comma-separated positive integers. An
  invalid catalog value stops the sidecar at startup."
- In `## Adding New Environment Variables`, correct two stale steps: step 2 names
  `apps/web/sidecar/src/server.ts` (not `server.js`), and step 4 says "Add the variable to
  `apps/web/sidecar/.env.example` and `infra/k8s/base/web/source/web-sidecar.env`" (there is no
  `env/` directory).

The behavior sentences above describe the whole set's result; later plans implement it. Keep
the wording as given.

## Tests

- `packages/helpers-config/src/catalogConfig.test.ts` (new, vitest, same style as
  `customThemesUrl.test.ts`; pass plain env objects, no `vi.stubEnv` needed):
  - parse: `undefined`, `''`, and `'  '` return `null`; `'920666,41504'` and
    `' 920666 , 41504 '` return `[920666, 41504]`; `'1,1,2'` returns `[1, 2]`; `'abc'` returns
    `[]`; `'5,abc,0,-3,07,6'` returns `[5, 6]`; a list of 2,000 distinct ids returns all 2,000
    (no cap).
  - build: an empty env gives `{ musicEnabled: true, addByRSSEnabled: true, podcastIndexIdAllowlist: null }`
    for both prefixes; both flags `'true'` give `false`; both `'false'` give `true`; an allowlist
    string is parsed. With prefix `''`, a `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED: 'true'` entry is
    ignored, and with prefix `'NEXT_PUBLIC_'`, a `CATALOG_MUSIC_DISABLED: 'true'` entry is
    ignored.
  - disabled-flag validator: blank is valid and not required; `'true'` and `'false'` are valid;
    `'yes'` and `'TRUE'` are invalid with `isRequired: true`; `category` is `'Catalog'`.
  - allowlist validator: blank is valid and not required; `'920666,41504'` is valid with message
    `'2 Podcast Index id(s)'`; `'920666,abc'` is invalid, required, and its message names `abc`;
    `','` is invalid and required.
  - `validateCatalogEnv`: returns three results named with the given prefix, in the order above.

No `catalogPolicy.test.ts`: the module is one line that reads config. No Playwright spec in this
plan; plan 11 adds the lane and a runtime-config check.

## Release scratchpad

```markdown
## Instance catalog settings (web)

- Surfaces: web, web runtime-config sidecar
- Change: three optional runtime keys on the web sidecar.
  `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED=true` turns Music off,
  `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED=true` turns Add by RSS off, and
  `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` takes comma-separated Podcast Index feed ids
  (no size limit). They limit what gets added from now on; stored content keeps its pages. Blank
  keeps today's full site. The sidecar validates them and refuses to start on an invalid value.
  They reach the app through runtime config, so a change needs a restart, not a rebuild. The
  parsing lives in `@podverse/helpers-config` so the API and workers read the same values.
- Who notices: self-hosters building a branded or single-interest instance
- Operator steps: none for existing deployments (blank keys)
```
