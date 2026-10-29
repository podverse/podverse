**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 11 — Notification time line uses Intl.RelativeTimeFormat on mobile, as on web

## Rows

R3, R17, R18, R19

## Runs after

20, 21

Plans 20 and 21 both edit `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx` and
`apps/web/src/app/notifications/NotificationsPageClient.tsx`. Plan 21 also edits
`packages/i18n-catalog/consumer/originals/*.json` and runs `npm run i18n:compile`, which rewrites
every `overrides/*.json`. This plan edits the same two screens and the same consumer originals and
runs `i18n:compile` too, so it runs alone, after 21. Plan 10 runs after this plan (it shares
`apps/mobile/vitest.config.ts`, `release-notes/scratchpad.md`, and `i18n:compile`).

Anchor every edit in those two screens by symbol (`InboxNotificationRow`, `NotificationRow`,
`getRelativeTimeLabel`), not by line number. Plans 20 and 21 move lines.

## Answer to R3 (from the code)

The `#` the operator saw is the relative-time line under every mobile inbox row and in the body of
the in-app banner. `formatNotificationRelativeTime` in
`apps/mobile/src/notifications/accountNotificationLineLabels.ts` calls
`t('notifications_page.relative_time_<unit>s_<ago|from_now>', { count })`. Those keys are next-intl
ICU plurals (`{count, plural, one {# hour ago} other {# hours ago}}`). Mobile's i18next has no ICU
support and renders `"2 other {# hours ago}}"`. Both `InboxNotificationRow` (visible text and its
`accessibilityLabel`) and `BannerNotificationHost.tsx` (banner `body`) call it.

Web is not affected: `getRelativeTimeLabel` in `NotificationsPageClient.tsx` formats
`getRelativeTimeParts` output with `Intl.RelativeTimeFormat` and never reads those keys.

## Settled by the operator (D1)

The mobile inbox time line and the in-app banner use the platform relative-time formatter
(`Intl.RelativeTimeFormat`), as web does. They do not read catalog ICU strings.

## What this plan builds

1. **One shared formatter.** `formatRelativeTimeLabel(value, locale, nowMs?)` in
   `packages/helpers/src/lib/date.ts`, next to `getRelativeTimeParts`. Web's private
   `getRelativeTimeLabel` and mobile's `formatNotificationRelativeTime` both go away, and all three
   callers use the shared function (**reuse-beyond-components**). It fits the tier rules:
   `@podverse/helpers` already holds `getRelativeTimeParts`, adds no dependency, and both apps
   already import `date.js` through the barrel. Web bundle size is unchanged in practice: one small
   function replaces a local one.
2. **A mobile polyfill.** Hermes in this Expo SDK lacks `Intl.RelativeTimeFormat` (checked below),
   so mobile loads the smallest formatjs polyfill set before anything renders.
3. **The `notifications_page.relative_time_*` keys are deleted.** Nothing reads them once mobile
   stops calling them (checked below).

### Hermes check

`apps/mobile` runs Expo SDK 58, React Native 0.88.0, Hermes `260318099.0.4`. The built Hermes
binaries list these Intl constructors and nothing else:

- Android (`hermes-android-260318099.0.4` AAR, `libhermesvm.so` plus `com/facebook/hermes/intl/*`):
  `Collator`, `DateTimeFormat`, `NumberFormat`, `getCanonicalLocales`.
- iOS (`hermesvm.xcframework`, simulator slice): `Intl.Collator`, `Intl.DateTimeFormat`,
  `Intl.NumberFormat`, `getCanonicalLocales`.

Neither has `Intl.RelativeTimeFormat`, `Intl.PluralRules`, or `Intl.Locale`. Without a polyfill,
`new Intl.RelativeTimeFormat(...)` throws in render on both platforms.

### Polyfill choice (smallest that works)

Add two packages to `apps/mobile` only:

- `@formatjs/intl-pluralrules` `^6.3.16` (`Intl.RelativeTimeFormat` needs `Intl.PluralRules`)
- `@formatjs/intl-relativetimeformat` `^12.3.16`

Load the conditional `polyfill.js` entry of each (it installs only when the runtime lacks the API),
plus locale data for the app's four languages only (`en`, `es`, `fr`, `el`). Do **not** add
`@formatjs/intl-locale`. Raw sizes measured from the published packages: relativetimeformat
polyfill 33 KB, pluralrules polyfill 48 KB, their shared `@formatjs/intl-localematcher` 63 KB and
`@formatjs/bigdecimal` 15 KB, locale data about 75 KB for both packages and four languages. That is
about 230 KB before Hermes bytecode. `@formatjs/intl-locale` would add about 350 KB more
(`intl-locale`, `intl-getcanonicallocales`, `intl-supportedvaluesof`).

`Intl.Locale` is not needed because the shared formatter passes `localeMatcher: 'lookup'`. Lookup
matching strips subtags and never calls `Intl.Locale`. The default best-fit matcher calls
`new Intl.Locale(...).maximize()` outside a `try` when the requested tag has no exact data match.
Checked in Node with `Intl.RelativeTimeFormat`, `Intl.PluralRules`, and `Intl.Locale` deleted, then
these two polyfills and four locale-data files loaded:

| Locale | -2 hours | 0 seconds | +5 minutes | -1 day |
| --- | --- | --- | --- | --- |
| `en-US` | 2 hours ago | now | in 5 minutes | yesterday |
| `es` | hace 2 horas | ahora | dentro de 5 minutos | ayer |
| `fr` | il y a 2 heures | maintenant | dans 5 minutes | hier |
| `el-GR` | πριν από 2 ώρες | τώρα | σε 5 λεπτά | χθες |

Node's built-in `Intl` gives the same strings.

Side effect, intended: once `Intl.PluralRules` exists, i18next picks plural forms with real CLDR
rules instead of its "exactly 1 is `one`" fallback. Existing mobile `_one` / `_other` keys keep
working. French `0` takes the `one` form, which is correct French. A regional code such as `en-US`
throws inside the polyfilled best-fit matcher, and i18next's `getRule` catches that and retries the
language part (`en`), which works.

Both packages are pure JS (no native rebuild) and MIT-licensed (no F-Droid concern).

### Locale per surface (intentional divergence)

- **Mobile** passes `i18n.language` from `useTranslation()` (`en-US`, `es`, `fr`, or `el-GR`). The
  line matches the app's language, including an account locale override, and the locale always has
  loaded polyfill data. Hermes's default locale is the device's, which may have no data and would
  not follow an account override.
- **Web** passes `undefined`, the browser default, exactly as `getRelativeTimeLabel` does today. Web
  output does not change.

### Catalog keys

`rg relative_time_` outside `node_modules` and `.llm/` finds only `accountNotificationLineLabels.ts`
and `packages/i18n-catalog/consumer/{originals,overrides}/*.json`. `apps/*/i18n/compiled/` is
generated and gitignored. Once mobile stops calling them, nothing reads the nine
`notifications_page.relative_time_*` keys (`just_now` plus the eight plural keys). Delete them.
Every value in `consumer/overrides/{es,fr,el-GR}.json` for those nine keys is `""`, so
`i18n:compile` drops no operator copy.

## Files

packages/helpers/src/lib/date.ts
packages/helpers/src/lib/date.test.ts
apps/web/src/app/notifications/NotificationsPageClient.tsx
apps/mobile/src/notifications/accountNotificationLineLabels.ts
apps/mobile/src/notifications/BannerNotificationHost.tsx
apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx
apps/mobile/src/shims/intlPolyfills.ts
apps/mobile/src/shims/intlPolyfills.test.ts
apps/mobile/index.js
apps/mobile/package.json
apps/mobile/package-lock.json
apps/mobile/vitest.config.ts
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
packages/i18n-catalog/consumer/overrides/es.json
packages/i18n-catalog/consumer/overrides/fr.json
packages/i18n-catalog/consumer/overrides/el-GR.json
.cursor/rules/reuse-beyond-components.mdc
release-notes/scratchpad.md

`consumer/overrides/*.json` change only through `npm run i18n:compile`.
`packages/helpers/src/index.ts` already has `export * from './lib/date.js';` and does not change.

## Change

### 1. `packages/helpers/src/lib/date.ts`

Below `getRelativeTimeParts`, add a module-level cache and the formatter:

```typescript
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function getRelativeTimeFormatter(locale: string | undefined): Intl.RelativeTimeFormat {
  const cacheKey = locale ?? '';
  const cached = relativeTimeFormatters.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.RelativeTimeFormat(locale, {
    localeMatcher: 'lookup',
    numeric: 'auto',
  });
  relativeTimeFormatters.set(cacheKey, formatter);
  return formatter;
}

export function formatRelativeTimeLabel(
  value: string | null | undefined,
  locale: string | undefined,
  nowMs: number = Date.now()
): string {
  const parts = getRelativeTimeParts(value, nowMs);
  if (parts === null) {
    return '';
  }

  return getRelativeTimeFormatter(locale).format(parts.value, parts.unit);
}
```

`locale` is a required parameter that accepts `undefined`, so every caller states which locale it
renders in.

Doc comment on `formatRelativeTimeLabel`, future-forward, about four lines:

- It renders `getRelativeTimeParts` as "2 hours ago", "in 5 minutes", "yesterday", or "now" in
  `locale`. `undefined` takes the runtime default. An unusable timestamp gives `''`.
- Formatters are cached per locale because list rows call this once each.
- Lookup locale matching never needs `Intl.Locale`, which the mobile polyfill set leaves out.

Rewrite the second paragraph of the `getRelativeTimeParts` doc comment. It now says the formatting
is not shared, which stops being true. Keep the point about one set of bucket boundaries ("1 hour
ago" on one device versus "60 minutes ago" on another), and say that `formatRelativeTimeLabel`
renders the parts and each caller passes its own locale. Keep the paragraph about negative values
and `null` as it is.

### 2. `packages/helpers/src/lib/date.test.ts`

Add `formatRelativeTimeLabel` to the `./date.js` import and a `describe('formatRelativeTimeLabel')`
next to `describe('getRelativeTimeParts')`. Use one fixed `nowMs` and ISO strings built from it.
Write the cases as one table-driven `it.each`, plus one `it` for the unusable input:

| Offset from now | Locale | Expected |
| --- | --- | --- |
| -2 hours | `en-US` | `2 hours ago` |
| -2 hours | `fr` | `il y a 2 heures` |
| -2 hours | `el-GR` | `πριν από 2 ώρες` |
| 0 | `en-US` | `now` |
| -1 day | `en-US` | `yesterday` |
| +5 minutes | `en-US` | `in 5 minutes` |

`formatRelativeTimeLabel('not a date', 'en-US', nowMs)` returns `''`.

### 3. `apps/web/src/app/notifications/NotificationsPageClient.tsx`

- Delete the module function `getRelativeTimeLabel`.
- In the `@podverse/helpers` value import, replace `getRelativeTimeParts` with
  `formatRelativeTimeLabel`. Keep the names sorted the way the file sorts them.
- In `NotificationRow`, `const timeLabel = formatRelativeTimeLabel(row.created_at, undefined);`.

Nothing else on web changes.

### 4. `apps/mobile/src/notifications/accountNotificationLineLabels.ts`

Delete `formatNotificationRelativeTime`, the `RelativeTimeTranslator` type, and the
`getRelativeTimeParts` import. `accountNotificationLineLabels` stays as it is. Do not leave a
pass-through wrapper around the shared function (**avoid-reexport-wrappers**).

### 5. `apps/mobile/src/screens/notifications/NotificationsInboxScreen.tsx`

- Remove `formatNotificationRelativeTime` from the `../../notifications/accountNotificationLineLabels`
  import. Keep `accountNotificationLineLabels`.
- Add `formatRelativeTimeLabel` to the existing `@podverse/helpers` value import.
- In `InboxNotificationRow`: `const { i18n, t } = useTranslation();` and
  `const timeLabel = formatRelativeTimeLabel(item.created_at, i18n.language);`.

The visible time text and the row's `accessibilityLabel` both use `timeLabel`, so both get the fixed
string. Leave the rest of the row alone. The unread prefix key belongs to plan 21.

### 6. `apps/mobile/src/notifications/BannerNotificationHost.tsx`

- Remove `formatNotificationRelativeTime` from the `./accountNotificationLineLabels` import.
- Add `formatRelativeTimeLabel` to the existing `@podverse/helpers` value import.
- Where the component calls `useTranslation()`, destructure `{ i18n, t }`.
- `body={formatRelativeTimeLabel(visible.notification.created_at, i18n.language) || null}`.

### 7. `apps/mobile/src/shims/intlPolyfills.ts` (new)

Side-effect imports only, in this order. Each locale-data file registers through the constructor
its polyfill installed, so it must come after that polyfill:

```typescript
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/el.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/el.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
import '@formatjs/intl-relativetimeformat/locale-data/es.js';
import '@formatjs/intl-relativetimeformat/locale-data/fr.js';
```

Keep the `.js` suffixes. Both packages' `exports` maps list `./polyfill.js` and `./locale-data/*`,
and Metro's exports resolution does not add an extension. Each import has a `.d.ts`, so TypeScript
6's side-effect import check passes. The repo's `simple-import-sort/imports` rule keeps side-effect
imports in the order they are written, so no lint disable comment is needed.

Header doc comment, future-forward, about five lines:

- Hermes provides `Intl.NumberFormat`, `DateTimeFormat`, and `Collator`, but not
  `Intl.PluralRules` or `Intl.RelativeTimeFormat`.
- The notification time line formats with `Intl.RelativeTimeFormat`, which needs
  `Intl.PluralRules`. i18next also picks plural forms through `Intl.PluralRules`.
- Each polyfill installs only when the runtime lacks the API.
- Locale data covers the app's four languages. A language added to `SUPPORTED_LOCALES` needs its
  two data imports here.
- `Intl.Locale` is not polyfilled, because `formatRelativeTimeLabel` matches locales by lookup.

### 8. `apps/mobile/index.js`

Add `import './src/shims/intlPolyfills';` as the second line, right after
`import './src/shims/webCrypto';`, so the APIs exist before any module that could construct
`Intl.PluralRules` or `Intl.RelativeTimeFormat` is evaluated.

### 9. `apps/mobile/package.json` and `apps/mobile/package-lock.json`

Add to `dependencies`, alphabetically:

- `"@formatjs/intl-pluralrules": "^6.3.16"`
- `"@formatjs/intl-relativetimeformat": "^12.3.16"`

Then regenerate the mobile lockfile from the repo root with `npm run mobile:install`. Load the Nix
environment first (**nix-terminal-wrapper**), and expect it to need the network. This is an
install, not a test. If the install fails for a reason other than the network, stop and report;
do not hand-edit `package-lock.json`. No `expo install` is needed (neither package is an Expo
module), and no `mobile:prebuild` is needed (no native code).

### 10. `apps/mobile/vitest.config.ts`

- Add `'src/shims/intlPolyfills.test.ts'` to `include`, next to
  `'src/shims/nodeCryptoShim.test.ts'`.
- In the header doc comment, add one clause beside the other `src/` entries: "the Intl polyfills
  Hermes needs for plural rules and relative time (`src/shims/intlPolyfills.ts` — Hermes is
  simulated by removing the native constructors)". Edit with StrReplace, because the comment is
  long.

### 11. Catalog keys

In `packages/i18n-catalog/consumer/originals/{en-US,es,fr,el-GR}.json`, delete these nine keys under
`notifications_page`, and nothing else:

- `relative_time_just_now`
- `relative_time_seconds_ago`, `relative_time_seconds_from_now`
- `relative_time_minutes_ago`, `relative_time_minutes_from_now`
- `relative_time_hours_ago`, `relative_time_hours_from_now`
- `relative_time_days_ago`, `relative_time_days_from_now`

Keep the JSON valid (watch the trailing comma on the key before them). Then run
`npm run i18n:compile` from the repo root. That is a build step, not a test. It removes the same
keys from `consumer/overrides/*.json` and rewrites the gitignored compiled bundles. Before
compiling, confirm with `rg relative_time_ packages/i18n-catalog/consumer/overrides` that every
match has the value `""`. If any has text, stop and report. That would be operator copy.

### 12. `.cursor/rules/reuse-beyond-components.mdc`

In "When you find the same logic twice, collapse it", replace the example sentence "Two inboxes can
share which unit describes a gap without sharing how they hold an `Intl` formatter." with "Two
inboxes share one relative-time formatter, and each passes the locale it renders in." The bullet
above it ("leave presentation and locale wiring to each surface") stays.

## Tests

- **Unit (helpers, Vitest)**: `describe('formatRelativeTimeLabel')` in
  `packages/helpers/src/lib/date.test.ts`, per Change § 2.
- **Unit (mobile, Vitest, node)**: new `apps/mobile/src/shims/intlPolyfills.test.ts`. It simulates
  Hermes and checks that the shim alone makes the shared formatter work in all four app locales.
  - `beforeAll`: save the property descriptors of `Intl.PluralRules`, `Intl.RelativeTimeFormat`, and
    `Intl.Locale` (`Object.getOwnPropertyDescriptor(Intl, name)`), `delete` all three, then
    `await import('./intlPolyfills')`. The dynamic import has to come after the deletes, because a
    static import would run first.
  - `afterAll`: put each saved descriptor back with `Object.defineProperty(Intl, name, descriptor)`.
  - Assert `typeof Intl.Locale === 'undefined'` (the shim does not depend on it), and that
    `Intl.RelativeTimeFormat` and `Intl.PluralRules` are now defined.
  - One `it.each` over `SUPPORTED_LOCALES` from `@podverse/helpers/locales`, with
    `formatRelativeTimeLabel` imported statically from `@podverse/helpers`. Two hours ago gives
    `2 hours ago` / `hace 2 horas` / `il y a 2 heures` / `πριν από 2 ώρες`. The same instant gives
    `now` / `ahora` / `maintenant` / `τώρα`. Key the expected strings by locale in a `Record`, so a
    fifth supported locale fails the test until its data imports are added.
  - `new Intl.PluralRules('fr').select(0)` is `'one'`, and `new Intl.PluralRules('en').select(2)`
    is `'other'`.
- **Web E2E**: no spec change. The inbox spec (`apps/web/e2e/notifications-inbox.spec.ts`) does not
  assert time text, and web output is unchanged. It still covers the page this plan edits.
- **Maestro**: no flow change. The time text depends on the clock, so a text assertion would be
  flaky. The unit tests hold the string claim (**mobile-test-economics**). Running
  `notifications-inbox` and `banner-notification` on a device proves the polyfill loads on Hermes:
  without it, both screens throw in render. Their screenshots show the fixed time line.

## Release scratchpad

```markdown
## Mobile notification times read like web, with no raw "#"

- Surfaces: mobile, web, shared i18n catalog
- Change: the time under each mobile inbox notification and in the in-app banner read like
  "2 other {# hours ago}}". Mobile now formats it with the platform relative-time formatter, as
  web does, in the app's language: "2 hours ago", "yesterday", "now". Screen readers on inbox rows
  hear the same corrected text. Web's inbox uses the same shared formatter with no visible change.
  Mobile now bundles small `Intl.PluralRules` and `Intl.RelativeTimeFormat` polyfills for its four
  languages, because Hermes lacks both. That also gives the app's plural strings each language's
  own plural rules (French "0" takes the singular form). The unused
  `notifications_page.relative_time_*` catalog keys are removed.
- Who notices: signed-in mobile users with notifications; screen reader users on the inbox;
  translators (nine fewer keys, none of which had override text)
- Operator steps: none. The polyfills are JavaScript only, so no native rebuild is needed.
```
