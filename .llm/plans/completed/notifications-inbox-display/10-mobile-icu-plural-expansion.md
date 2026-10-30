**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 10 — Mobile renders the shared catalog's ICU plural strings

## Rows

R20, R21, R22

## Runs after

11, 21

Plan 21 edits `packages/i18n-catalog/mobile/originals/*.json` and runs `npm run i18n:compile`, which
rewrites every `overrides/*.json`. Plan 11 edits consumer originals, runs `i18n:compile`, and edits
`apps/mobile/vitest.config.ts` and `release-notes/scratchpad.md`. This plan edits the mobile
originals, the vitest config, and the scratchpad, and runs `i18n:compile`, so it runs alone after
both.

## Settled by the operator (D2)

Removed Content and the OPML rate-limit message use the shared catalog strings. The mobile-only
copies are deleted. A load-time converter makes those shared plural strings render on mobile. The
notification time line is not part of this plan: plan 11 moves it to `Intl.RelativeTimeFormat` and
deletes the `notifications_page.relative_time_*` keys.

## Background (from the code)

The catalog is authored for next-intl, so shared and consumer plurals are ICU strings, for example
`{count, plural, one {# of your clips now shows Content Removed.} other {# of your clips now show Content Removed.}}`.
Mobile runs i18next with single-brace interpolation (`prefix: '{'`, `suffix: '}'` in
`apps/mobile/src/i18n/index.ts`) and no ICU support. It reads `{count, plural, one {# …}` as one
placeholder, prints the number, and leaves the rest on screen.

Two mobile screens dodge this today with mobile-layer i18next suffix copies of consumer ICU keys:

| Mobile caller | Mobile-only copy today | Shared consumer key |
| --- | --- | --- |
| `removedContentSentences` in `apps/mobile/src/screens/more/MoreRemovedContentScreen.tsx` | `removed_content.clips_one` / `clips_other`, `removed_content.playlist_entries_one` / `playlist_entries_other` | `settings.advanced.clips`, `settings.advanced.playlist_entries` (`{count, plural, …}`) |
| `formatOpmlRetryAfterTime` in `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts` (used by `buildOpmlRateLimitMessage`, called from `src/hooks/useOpmlImport.ts`) | `features.opml.rate_limited_time_one` / `rate_limited_time_other` | `settings.opml.import_rate_limited_time` (`{minutes, plural, one {# minute} other {# minutes}}`) |

The mobile copies carry the same wording as the consumer strings in all four locales (compared
key by key), so the rendered text does not change.

After plan 11 deletes the eight relative-time keys, the consumer layer holds seven ICU strings per
locale (the three above plus `value.boost_messages.retried_requests`,
`mint_rate_limit_wait_seconds`, `mint_rate_limit_wait_minutes`, `currency_minor_units.satoshis`).
The shared and mobile layers hold none. Web reads all of them through next-intl and is not touched.

Plural selection: i18next picks `<key>_<category>` by `count` through `Intl.PluralRules`. Plan 11
polyfills `Intl.PluralRules` on Hermes, so the categories follow CLDR for each language. Without it,
i18next falls back to "exactly 1 is `one`, everything else `other`", and these strings still
render.

## Decision: expand ICU plurals once, at resource load

A mobile-local converter rewrites every ICU plural string in the bundle into i18next suffix keys
before `i18next.init`. It covers these keys and any ICU plural added to `shared` or `consumer`
later, with no per-key mobile copy.

Rejected options, so the implementer does not revisit them:

- **`i18next-icu` + `intl-messageformat`:** reparses every mobile string as ICU. A missing
  interpolation value then throws instead of rendering, `<tag>` text and some apostrophes change
  meaning, and mobile-layer `_one` / `_other` keys stop resolving. Too much blast radius.
- **Per-key mobile copies** (today's pattern): the operator chose to delete them (D2).
- **Build-time conversion in `packages/i18n-catalog/scripts/i18n-compile.ts`:** that package has no
  test runner, and the compile script serves every app. The runtime walk costs a substring check per
  string at startup, which is negligible.

## Files

apps/mobile/src/i18n/icuPlurals.ts
apps/mobile/src/i18n/icuPlurals.test.ts
apps/mobile/src/i18n/i18nInitOptions.ts
apps/mobile/src/i18n/index.ts
apps/mobile/src/i18n/resources.ts
apps/mobile/src/screens/more/MoreRemovedContentScreen.tsx
apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts
apps/mobile/vitest.config.ts
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
packages/i18n-catalog/mobile/overrides/es.json
packages/i18n-catalog/mobile/overrides/fr.json
packages/i18n-catalog/mobile/overrides/el-GR.json
release-notes/scratchpad.md

`mobile/overrides/*.json` change only through `npm run i18n:compile`.

## Change

### 1. `apps/mobile/src/i18n/icuPlurals.ts` (new, pure)

No React Native, Expo, or i18next imports. Named exports only.

Types:

```typescript
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type IcuPluralParse =
  | { kind: 'none' }
  | { kind: 'plural'; base: string; forms: Partial<Record<PluralCategory, string>> }
  | { kind: 'unsupported'; reason: string };

export type CatalogTree = { [key: string]: unknown };

export type IcuPluralExpansion = { tree: CatalogTree; unsupportedKeys: string[] };
```

`parseIcuPlural(value: string): IcuPluralParse`. Rules, in order:

1. If `value` does not match `/\{\s*[A-Za-z_][A-Za-z0-9_]*\s*,\s*(plural|select|selectordinal)\s*,/`,
   return `{ kind: 'none' }`. Plain strings, `{brand_name}` placeholders, and apostrophes such as
   "Can't" all take this path untouched.
1. If the matched keyword is `select` or `selectordinal`, return `unsupported`.
1. If the whole string contains an apostrophe (`'`) immediately followed by `{`, `}`, `#`, or
   another `'`, return `unsupported`. That is ICU quoting, which this expander does not implement.
   The one apostrophe in today's ICU strings (French `retried_requests`, "avant qu'elle") is
   followed by a letter and stays literal, as it does in ICU.
1. Parse the block that starts at the match: argument name, then after `plural,` optional
   whitespace, then a sequence of `selector {branch}` pairs, then the closing `}`.
   - `offset:` → `unsupported`.
   - A selector must be one of `zero`, `one`, `two`, `few`, `many`, `other`. Exact selectors
     (`=0`, `=1`, …) and anything else → `unsupported`.
   - A branch runs from its `{` to the matching `}`, counting nested braces. Unbalanced braces
     anywhere → `unsupported`.
   - A duplicate selector → `unsupported`. No `other` branch → `unsupported`.
   - A branch that contains another typed argument (`{name, …}`) → `unsupported`. Simple
     `{name}` placeholders inside a branch are allowed and kept as they are.
1. If the text after the block contains a second plural/select/selectordinal match, return
   `unsupported`.
1. Each form is `prefix + branch.replaceAll('#', '{<arg>, number}') + suffix`, where prefix and
   suffix are the text before and after the block. `{count, number}` goes through i18next's
   built-in `number` formatter (`Intl.NumberFormat` for the active language), which matches ICU's
   `#`: French renders "2 000", not "2000".
1. `base` is the `other` form.

`expandIcuPlurals(tree: CatalogTree): IcuPluralExpansion`:

- Walks the tree recursively. Nested plain objects (not arrays, not null) are walked. Other values
  are copied as they are.
- Returns new objects. It never mutates the input, because the input is a JSON module object that
  Metro shares.
- For a string leaf `K` whose parse is `plural`: write `K = base`, and `K_<category>` for every
  category in `forms`, including `other`. If any `K_<category>` already exists as a sibling in the
  source object, leave `K` and the siblings exactly as they were, and record the key as
  unsupported. A catalog conflict must not be overwritten silently.
- For `unsupported`: keep the original string and record the key.
- Recorded keys are dotted paths from the root (`settings.opml.import_rate_limited_time`).
- Never throws. This runs before first paint on every launch, and an operator override with an
  unsupported construct must not crash the app.

Short doc comments, future-forward:

- The catalog is authored in next-intl ICU form.
- Mobile's i18next selects plurals by `<key>_<category>` siblings and `count`, so a caller of a
  plural key whose argument is not `count` (`{minutes, plural, …}`) also passes `count`.

No plan or step references.

### 2. `apps/mobile/src/i18n/i18nInitOptions.ts` (new, pure)

Move the `interpolation` object out of `initializeI18n` so the unit test renders through the same
settings as the app:

```typescript
export const MOBILE_I18N_INTERPOLATION = {
  escapeValue: false,
  prefix: '{',
  suffix: '}',
} as const;
```

Move the existing comment about single-brace placeholders with it, and add one sentence: ICU plural
strings are expanded into i18next plural keys in `resources.ts`.

If `as const` makes the object fail i18next's `InterpolationOptions` type at the `init` call, type
it as `InterpolationOptions` imported with `import type { InterpolationOptions } from 'i18next'`
instead. That is a type-only import and adds nothing to the module.

### 3. `apps/mobile/src/i18n/index.ts`

`interpolation: MOBILE_I18N_INTERPOLATION`. Nothing else changes.

### 4. `apps/mobile/src/i18n/resources.ts`

When building `MOBILE_I18N_RESOURCES`, run each locale's compiled JSON through `expandIcuPlurals`
with one small local helper:

```typescript
function translationResources(locale: string, catalog: CatalogTree): CatalogTree {
  const { tree, unsupportedKeys } = expandIcuPlurals(catalog);
  if (__DEV__ && unsupportedKeys.length > 0) {
    console.warn('[i18n] ICU strings mobile cannot render', locale, unsupportedKeys);
  }
  return tree;
}
```

Keep the four locales and the `Resource` type. If `CatalogTree` does not assign to i18next's
`ResourceKey`, widen the helper's return type rather than adding an `as`.

### 5. `apps/mobile/src/screens/more/MoreRemovedContentScreen.tsx`

In `removedContentSentences`:

- `t('removed_content.clips', { count: row.clip_count })` becomes
  `t('settings.advanced.clips', { count: row.clip_count })`.
- `t('removed_content.playlist_entries', { count: row.playlist_entry_count })` becomes
  `t('settings.advanced.playlist_entries', { count: row.playlist_entry_count })`.

Every other `removed_content.*` key on this screen is mobile-only copy with no shared twin. Those
calls stay.

### 6. `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`

Replace the body of `formatOpmlRetryAfterTime` with one call:

```typescript
const minutes = getRetryAfterMinutes(retryAfterSeconds);
return t('settings.opml.import_rate_limited_time', { count: minutes, minutes });
```

Replace its doc comment, which says i18next does not evaluate consumer ICU plural keys and would
no longer be true. New wording: the shared string's argument is `minutes`, and mobile's i18next
picks the plural form by `count`, so both are passed. `TranslateFn` already accepts
`Record<string, string | number>`. `buildOpmlRateLimitMessage` and `handleRateLimitMessage` do not
change.

### 7. Mobile originals

In `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json`:

- Under `removed_content`, delete `clips_one`, `clips_other`, `playlist_entries_one`,
  `playlist_entries_other`. Keep the other ten `removed_content` keys.
- Under `features`, delete the whole `opml` object. Its only keys are `rate_limited_time_one` and
  `rate_limited_time_other` in all four locales.

Keep the JSON valid (watch trailing commas). Then run `npm run i18n:compile` from the repo root. That
is a build step, not a test. It drops the same keys from `mobile/overrides/{es,fr,el-GR}.json`,
where every one of them is `""` today, and rewrites the gitignored compiled bundles. Before
compiling, confirm with
`rg 'clips_one|clips_other|playlist_entries_one|playlist_entries_other|rate_limited_time' packages/i18n-catalog/mobile/overrides`
that every match has the value `""`. If any has text, stop and report. That would be operator copy.

Then confirm `rg "removed_content\.(clips|playlist_entries)|rate_limited_time" apps/mobile/src`
finds nothing.

### 8. `apps/mobile/vitest.config.ts`

- Add `'src/i18n/icuPlurals.test.ts'` to `include`, beside `'src/hooks/useReduceMotion.test.ts'`.
- In the header doc comment, add one clause beside the other `src/` entries: "the ICU plural
  expansion that lets i18next render the catalog's next-intl plural strings
  (`src/i18n/icuPlurals.ts`)". Edit with StrReplace; the comment is long. Plan 11 adds its own
  entry to the same comment and list. Keep both.

## Tests

`apps/mobile/src/i18n/icuPlurals.test.ts` (mobile vitest, node). Behavior-focused, grouped by
`describe`; no per-branch micro-tests.

- **Parse:**
  - The English `settings.advanced.clips` string gives `one` =
    `{count, number} of your clips now shows Content Removed.`, `other` =
    `{count, number} of your clips now show Content Removed.`, and `base` = the `other` form.
  - Text around the block is kept (`in {count, plural, …}` → `in {count, number} hour`).
  - A non-`count` argument (`{minutes, plural, one {# minute} …}`) gives `{minutes, number} minute`.
  - Plain strings, `{brand_name}`, and "Can't" return `none`.
- **Unsupported:** one table-driven case list: `select`, `selectordinal`, `=0`, `offset:`, two
  plural blocks, a nested plural, no `other`, unbalanced braces, `'{` quoting.
- **Tree:**
  - Suffix siblings appear, and the base becomes the `other` form.
  - The input object is unchanged (compare against a deep copy).
  - An existing `K_one` sibling leaves the key untouched and reports it.
  - A nested unsupported string reports its dotted path.
- **Catalog guard:** import the 12 originals with static JSON imports
  (`../../../../packages/i18n-catalog/<shared|consumer|mobile>/originals/<locale>.json`), and assert
  `expandIcuPlurals(...).unsupportedKeys` is empty for each. A future ICU string mobile cannot
  render fails here, not on a phone.
- **Rendered output:** build `i18next.createInstance()` with `MOBILE_I18N_INTERPOLATION`,
  `keySeparator: '.'`, `nsSeparator: false`, `returnNull: false`, and the expanded consumer originals
  for all four locales. Use that instance's `t`, bound to the locale under test.
  - `en-US`:
    - `settings.advanced.clips` with `count: 1` is `1 of your clips now shows Content Removed.`
      and with `count: 2` is `2 of your clips now show Content Removed.`
    - `settings.advanced.playlist_entries` with `count: 1` is
      `1 of your playlist entries now shows Content Removed.`
  - `buildOpmlRateLimitMessage(100, 60, t)` in `en-US` is
    `You can add up to 100 feeds per hour. To finish importing the rest, try again after 1 minute.`
    With `300` seconds, it ends `after 5 minutes.`
  - For each locale, each of `settings.advanced.clips`, `settings.advanced.playlist_entries`, and
    `settings.opml.import_rate_limited_time` (called as `{ count: n, minutes: n }`), and counts
    `1, 2, 5, 21, 1000`: the result contains no `#`, `{`, or `}`.
  - Spot check: `el-GR` `settings.opml.import_rate_limited_time` with count 3 is `3 λεπτά`.

No Maestro change. The claim is about string rendering, which a node unit test holds
(**mobile-test-economics**). `removed-content-log.yaml` opens the Removed Content screen, but its
seeded row has no clip or playlist counts. `opml.yaml` covers the OPML screen. Both still prove
the screens load with the expanded resources.

## Release scratchpad

```markdown
## Mobile reads the shared catalog's plural strings

- Surfaces: mobile, shared i18n catalog
- Change: mobile now expands the catalog's ICU plural strings (`{count, plural, …}`) into its own
  plural keys as it loads its strings, so a plural string written once for web also renders on
  mobile. Removed Content (the clip and playlist entry counts) and the OPML import rate-limit
  message now use the same shared strings as web, and the mobile-only copies of those strings are
  deleted from the mobile catalog in all four languages. The text people see does not change. A
  plural string added to the shared or consumer catalog later renders on mobile with no extra
  mobile copy.
- Who notices: translators and operators, who now edit these strings in one place; listeners see
  no change
- Operator steps: none
```
