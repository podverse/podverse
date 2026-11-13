**Cursor model:** Opus 5.5 · **Reasoning:** high

# 70 — Export OPML from the device while signed out

The sign-up warning (plan 71) tells a signed-out user to export OPML before signing up. Today
mobile Export OPML only works signed in: `MoreOpmlScreen` and `AccountAccessPanel` both call
`reqAccountOpmlExport` (`GET /account/opml/export`), and More › OPML disables the button unless
`status === 'authenticated'`. A signed-out user has no account, so the export is built on the
phone. It holds every feed the signed-out user follows: the Add by RSS feeds stored on the device,
plus the directory subscriptions, whose feed URLs the phone looks up from the public channel route
by `id_text`. One hook serves every Export OPML control.

## Rows

R35, R53, R54

## Runs after

30 (adds `addByRssRepository.listSignedOutFollowedFeeds()`), 42 (adds
`getRateLimitRetryAfterMs` in `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`). No API
plan: the route this plan reads already exists.

## Files

packages/helpers/src/lib/opml/generateOpml.ts
packages/helpers/src/lib/opml/generateOpml.test.ts
packages/helpers/src/index.ts
packages/helpers/package.json
apps/api/src/lib/opml/generateOpml.ts
apps/api/src/test/opml-generate.test.ts
apps/api/src/controllers/account/accountOpmlExport.ts
apps/mobile/src/data/repositories/subscriptionsRepository.ts
apps/mobile/src/lib/opml/opmlExportFile.ts
apps/mobile/src/lib/opml/opmlExportFile.test.ts
apps/mobile/src/lib/opml/directoryFeedUrlLookup.ts
apps/mobile/src/lib/opml/directoryFeedUrlLookup.test.ts
apps/mobile/src/hooks/useOpmlExport.ts
apps/mobile/src/screens/more/MoreOpmlScreen.tsx
apps/mobile/src/terms/AccountAccessPanel.tsx
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
apps/mobile/e2e/opml-signed-out.yaml
scripts/mobile/e2e-test.sh
.cursor/skills/mobile-test-economics/SKILL.md
release-notes/scratchpad.md

## Answers from the code

- **The server export includes Add by RSS feeds.** `AccountOpmlExportController.exportOpml`
  (`apps/api/src/controllers/account/accountOpmlExport.ts`) passes the account's directory
  follows (with `channel.feed`) and its `account_following_add_by_rss_channel` rows to
  `generateOpml`. A signed-in export already holds both kinds. It writes directory outlines first,
  then Add by RSS outlines; the device export keeps that order.
- **A public route already returns a channel's feed URL by `id_text`.** `GET /channel/:idOrIdText`
  (`apps/api/src/routes/channel.ts`, `ChannelController.getByIdOrIdText`) needs no session and
  loads `channelGetOneRelations`, which includes `feed: true`, so the body carries
  `feed.url` (`DTOChannel.feed?: DTOFeed`, `DTOFeed.url`). Mobile already reads it on About
  (`channelAboutCells.ts`), and web links it from `HeaderButtons.tsx`. The route answers 404 for a
  channel that is missing or not parsed-ready, and 410 with `merged_into` for an absorbed id
  (`sendMergedInto`). No API change is needed, so there is no plan 72.
- **No batch route returns feed URLs.** `POST /identity/resolve` takes up to
  `IDENTITY_RESOLVE_MAX_IDS` channel ids but returns merge redirects only. `reqChannelGetMany`
  returns lists by sort and category, not by id. So the device makes one call per subscription.
- **The route has no limiter in the API process.** `apps/api/src/app.ts` mounts no global
  `express-rate-limit`, and the channel router adds none. An edge in front of a deployment may
  still answer 429, so the device keeps a small, fixed number of calls in flight and waits out
  a 429 instead of failing.
- **The device stores no directory feed URL.** `subscribed_channel` in
  `apps/mobile/src/data/db/schema.ts` holds `id_text`, title, image, source, medium, kind, and
  rank. Signed out, every row is the signed-out user's (sign-out keeps the rows; see
  **mobile-anonymous-vs-account-features**). `subscriptionsRepository.listDirectoryIdTexts()`
  already reads them for the sign-up merge.
- **The public read helper exists.** `requestWithoutMobileAuth` in
  `apps/mobile/src/auth/authRequestWithRefresh.ts` sends with no bearer, never refreshes or
  clears a session, throws `OfflineModeEnabledError` while Offline Mode is on, and reports its
  outcome to the connectivity machine. `readMergedIntoRedirect` (`apps/mobile/src/lib/mergeRedirect.ts`)
  reads a 410's survivor id. `classifySyncError` (`apps/mobile/src/sync/syncErrorClassification.ts`)
  says whether a failure means offline or server unreachable.
- **Stored feed URLs carry no credentials.** `add_by_rss_feed.feed_url` never holds `user:pass@`
  (**add-by-rss-client-held-credentials**), and directory feed URLs come from the public route, so
  the file never contains a password.
- **There are two copies of the server export today.** `MoreOpmlScreen.handleExport` and
  `AccountAccessPanel.handleExportOpml` are the same code. This plan collapses both into the hook.
- **Mobile catalogs expand ICU plurals.** `apps/mobile/src/i18n/icuPlurals.ts` expands one
  `{count, plural, one {…} other {…}}` block per string, with `#` for the number. The new count
  strings use that form, with `count` as the variable.

## Change

### 1. Move `generateOpml` to `@podverse/helpers`

`generateOpml` in `apps/api/src/lib/opml/generateOpml.ts` is a pure string builder with no Node
imports, and mobile now needs it too (**reuse-beyond-components**).

- Create `packages/helpers/src/lib/opml/generateOpml.ts` with the same code, and export the two
  types: `export type OPMLChannelRow` and `export type GenerateOpmlParams`. Keep the output
  byte-identical (same `<title>Podverse Subscriptions Export</title>`, same outline attributes,
  same escaping, directory outlines before Add by RSS outlines).
- Add `export * from './lib/opml/generateOpml.js';` to `packages/helpers/src/index.ts`, next to
  the existing `./lib/opml/opmlImportErrors.js` line.
- Add a subpath to `packages/helpers/package.json` `exports`, after `./opml`:

```json
"./opml/generate": {
  "types": "./dist/lib/opml/generateOpml.d.ts",
  "default": "./dist/lib/opml/generateOpml.js"
},
```

- Move the test: `apps/api/src/test/opml-generate.test.ts` becomes
  `packages/helpers/src/lib/opml/generateOpml.test.ts`, importing `./generateOpml.js`. Keep both
  cases.
- Delete `apps/api/src/lib/opml/generateOpml.ts` and `apps/api/src/test/opml-generate.test.ts`.
- In `accountOpmlExport.ts`, import `generateOpml` from `@podverse/helpers` (value import on its
  own line). No other API change; the response is unchanged.

### 2. Repository reads — `subscriptionsRepository.ts`

Add two members to `subscriptionsRepository`, after `listDirectoryIdTexts`. Screens and hooks
reach the API only through repositories (**mobile-data-layer**).

```typescript
export type DirectoryExportEntry = { idText: string; title: string };

export type DirectoryFeedUrlLookup =
  | { feedUrl: string; kind: 'found'; title: string | null }
  | { kind: 'missing' }
  | { kind: 'rate_limited'; retryAfterMs: number }
  | { kind: 'unreachable' };
```

- `listDirectoryForExport(): Promise<DirectoryExportEntry[]>` — `initializeDatabase()`, then
  `select({ idText, title })` from `subscribed_channel`, sorted in JS by
  `title.localeCompare(other.title, undefined, { sensitivity: 'base' })`, then `idText`.
- `fetchDirectoryFeedUrl(idText: string): Promise<DirectoryFeedUrlLookup>`:
  1. `const channel = await requestWithoutMobileAuth((api) => api.reqChannelGetByIdOrIdText(idText));`
  1. On success: `feed?.url` trimmed; non-empty → `{ kind: 'found', feedUrl, title: channel.title ?? null }`;
     otherwise `{ kind: 'missing' }`.
  1. On a thrown error, in this order:
     - `readMergedIntoRedirect(error)` names a `channel` → call the route once more with the
       survivor's `idText` and map that result by these same rules, except a second 410 is
       `missing`. Never follow more than one hop.
     - `getRateLimitRetryAfterMs(error)` is not null → `{ kind: 'rate_limited', retryAfterMs }`.
     - `classifySyncError(error)` has `isOffline` or `isServerUnreachable` →
       `{ kind: 'unreachable' }`. This covers `OfflineModeEnabledError`.
     - Anything else (404, 410 without `merged_into`, other 4xx, a parse failure) →
       `{ kind: 'missing' }`.
  1. Log nothing here; a missing podcast is an expected outcome the result reports.

### 3. Lookup pool — `apps/mobile/src/lib/opml/directoryFeedUrlLookup.ts`

Pure module: no React Native, Expo, or repository imports, so it runs in node tests.

```typescript
import type { DirectoryExportEntry, DirectoryFeedUrlLookup } from '…/subscriptionsRepository';

/** Calls in flight at once. Small, so a large library never bursts the API. */
export const DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY = 4;
/** A 429 asking for a longer wait than this ends the run; the rest are left out. */
export const DIRECTORY_FEED_URL_RATE_LIMIT_MAX_WAIT_MS = 60_000;
/** Progress reaches the UI at most this often, and always on the last lookup. */
export const DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS = 500;

export type DirectoryFeedUrlLookupResult = {
  /** Found feeds in the order of `entries`. */
  found: { feedUrl: string; title: string | null }[];
  missingCount: number;
};

export const lookupDirectoryFeedUrls = async (params: {
  entries: readonly DirectoryExportEntry[];
  lookup: (idText: string) => Promise<DirectoryFeedUrlLookup>;
  now: () => number;
  onProgress: (done: number, total: number) => void;
  signal: AbortSignal;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
}): Promise<DirectoryFeedUrlLookupResult | null> => { … };

export const sleepUnlessAborted = (ms: number, signal: AbortSignal): Promise<void> => { … };
```

The `DirectoryExportEntry` and `DirectoryFeedUrlLookup` imports are `import type` only, so the
module stays free of runtime repository imports.

Behavior of `lookupDirectoryFeedUrls`:

- Returns `null` when `signal` is aborted at any point; the caller writes nothing.
- An empty `entries` returns `{ found: [], missingCount: 0 }` without calling `onProgress`.
- Calls `onProgress(0, total)` once before the first lookup.
- Runs `DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY` workers over one shared index into `entries`.
  Each worker takes the next index, awaits `lookup(entry.idText)`, and stores the outcome at that
  index, so `found` keeps the order of `entries` however calls finish. Each worker checks
  `signal.aborted` before taking an index.
- `found` → stored. A `null` title falls back to the entry's local `title`.
- `missing` → counted as left out.
- `rate_limited` → when `retryAfterMs <= DIRECTORY_FEED_URL_RATE_LIMIT_MAX_WAIT_MS` and this
  entry has not been retried yet, set a shared `pausedUntilMs = now() + retryAfterMs` and put the
  entry back for one retry. Every worker, before its next call, sleeps until `pausedUntilMs`
  with `sleep(…, signal)`. A second 429 for the same entry, or a wait over the maximum, stops the
  run as below.
- `unreachable` → stop the run: no worker takes a new index; calls already in flight finish and
  are kept.
- When a run stops, every entry with no stored outcome counts as left out.
- A thrown `lookup` (a bug, not a network answer) counts that entry as left out and continues.
- `done` counts entries with a final outcome, including those left out when a run stops.
  `onProgress(done, total)` fires when at least `DIRECTORY_FEED_URL_PROGRESS_INTERVAL_MS` has
  passed (by `now()`) since the last call, and always once when `done === total`.

`sleepUnlessAborted` resolves after `ms` with `setTimeout`, or immediately when `signal` aborts
(clear the timer and remove the listener either way).

### 4. Export file helpers — `apps/mobile/src/lib/opml/opmlExportFile.ts`

No React Native or Expo imports.

```typescript
import { generateOpml } from '@podverse/helpers/opml/generate';

export type DeviceOpmlFeed = { feedUrl: string; title: string | null };

export const opmlExportFilename = (now: Date): string =>
  `podverse-opml-export-${now.toISOString().split('T')[0]}.opml`;

/** Null when there is nothing to write. */
export const buildDeviceOpmlExport = (params: {
  addByRssFeeds: readonly DeviceOpmlFeed[];
  directoryFeeds: readonly DeviceOpmlFeed[];
}): string | null => {
  if (params.addByRssFeeds.length === 0 && params.directoryFeeds.length === 0) {
    return null;
  }
  return generateOpml({
    addByRssChannels: [...params.addByRssFeeds],
    directoryChannels: [...params.directoryFeeds],
  });
};
```

The filename format is the one both existing copies use; keep it. Do not dedupe a directory feed
whose URL matches an Add by RSS feed; the server export does not either.

### 5. `useOpmlExport` hook — `apps/mobile/src/hooks/useOpmlExport.ts`

Named export, no default export.

```typescript
export type OpmlExportSource = 'account' | 'device' | 'unavailable';

/** A catalog key and the numbers it interpolates. */
export type OpmlExportMessage = { key: string; params?: Record<string, number> };

export type UseOpmlExportResult = {
  clearStatus: () => void;
  errorKey: string | null;
  exportOpml: () => Promise<void>;
  isExporting: boolean;
  notice: OpmlExportMessage | null;
  source: OpmlExportSource;
};

export const useOpmlExport = (): UseOpmlExportResult => { … };
```

- `source` comes from `useAuth().status`: `'authenticated'` → `'account'`, `'anonymous'` →
  `'device'`, `'unknown'` → `'unavailable'`.
- Keep an `AbortController` ref for the running export. An unmount effect aborts it. Every state
  write after an `await` first checks that this run's signal is not aborted, so a dismissed
  screen gets no late notice and no share sheet.
- `exportOpml`:
  1. Return at once when `source === 'unavailable'` or an export is already running. Guard with a
     ref inside the handler, not only the button's `disabled` (**input-rate-control**).
  1. Set `isExporting` true, `errorKey` null, `notice` `{ key: 'settings.opml.export_loading' }`.
  1. `'account'`: get the text exactly as `MoreOpmlScreen.handleExport` does today
     (`requestWithMobileAuthRefresh` with `accessToken`, `clearSession`, `refreshToken`,
     `setTokens` from `useAuth`, calling `api.reqAccountOpmlExport({ responseType: 'text' })` and
     throwing when the result is not a string). The success notice is
     `{ key: 'settings.opml.export_success' }`.
  1. `'device'`, in order:
     1. Read both lists at once:
        `addByRssRepository.listSignedOutFollowedFeeds()` (keep `feedUrl` and `title`) and
        `subscriptionsRepository.listDirectoryForExport()`.
     1. Both empty: `notice` `{ key: 'settings.opml.export_device_empty' }`, stop. No file.
     1. Directory entries and `isOfflineModeEnabled()` (`prefs/offlineMode`): make no lookups;
        every entry is left out.
     1. Otherwise, with directory entries: `lookupDirectoryFeedUrls` with
        `lookup: subscriptionsRepository.fetchDirectoryFeedUrl`, `now: Date.now`,
        `sleep: sleepUnlessAborted`, this run's signal, and `onProgress` setting `notice` to
        `{ key: 'settings.opml.export_device_looking_up', params: { done, total } }`. A `null`
        result (aborted) ends the run with no state change.
     1. `buildDeviceOpmlExport({ addByRssFeeds, directoryFeeds: result.found })`. When it is null
        (no Add by RSS feeds and no directory feed found), write no file and set `errorKey`, with
        `notice` null:
        - `'settings.opml.export_device_offline_mode_unavailable'` when Offline Mode is on now;
        - `'settings.opml.export_device_lookup_failed'` otherwise.
     1. Otherwise write and share the file (next steps), then choose the notice by
        `missingCount` and Offline Mode, read after the lookups finish:
        - `missingCount === 0` → `{ key: 'settings.opml.export_success' }`;
        - Offline Mode on → `{ key: 'settings.opml.export_device_offline_mode', params: { count: missingCount } }`;
        - otherwise → `{ key: 'settings.opml.export_device_partial', params: { count: missingCount } }`.
  1. Write the text to `` `${baseDirectory}${opmlExportFilename(new Date())}` `` with
     `FileSystem.writeAsStringAsync` (`expo-file-system/legacy`), where `baseDirectory` is
     `FileSystem.cacheDirectory ?? FileSystem.documentDirectory`; throw when both are null.
  1. Unless `isMobileE2eFromEnv()`, present the share sheet through
     `presentShareSheet(() => Share.share({ title: filename, url: fileUri }))` from
     `lib/share/shareSheetPassthrough`, the same call `shareRemoteFile` uses, so the tap that
     dismisses the sheet does not land on the screen underneath.
  1. Set the chosen notice.
  1. On any thrown error: `errorKey` `'settings.opml.export_error'`, `notice` null. Always clear
     `isExporting` and the running ref in `finally` (**mobile-surface-async-errors**).
- `clearStatus` sets `notice` and `errorKey` to null.
- Lookups run on the interactive lane, not the sync queue: the user tapped and is watching the
  button spinner (**mobile-sync-orchestration**).

What the user gets offline:

| Situation | File | Message |
| --- | --- | --- |
| Offline Mode on, Add by RSS feeds present | Add by RSS feeds only | `export_device_offline_mode` with the directory count |
| Offline Mode on, only directory subscriptions | none | `export_device_offline_mode_unavailable` |
| Connection lost (Offline Mode off) | what was found before the first unreachable answer, plus Add by RSS feeds | `export_device_partial` with the count left out |
| Connection lost, nothing found, no Add by RSS feeds | none | `export_device_lookup_failed` |
| Offline Mode on, no directory subscriptions | Add by RSS feeds | `export_success` |

### 6. Callers

**`MoreOpmlScreen.tsx`**

- Delete `handleExport`, the `isExporting` / `errorKey` / `noticeKey` state, and the imports only
  it used (`FileSystem`, `Share`, `requestWithMobileAuthRefresh`, `isMobileE2eFromEnv` if
  unused). Use `const opmlExport = useOpmlExport();`.
- The Export card's description: `t('settings.opml.export_description')` when
  `opmlExport.source === 'account'`, else `t('settings.opml.export_description_device')`.
- The Export button: `disabled={opmlExport.source === 'unavailable' || opmlExport.isExporting}`,
  `loading={opmlExport.isExporting}`, `onPress={() => { void opmlExport.exportOpml(); }}`. Keep
  `testID="opml-export-button"`, `size="form"`, `fullWidth`, and the label.
- Keep the `opml-export-notice` line, rendering `t(opmlExport.notice.key, opmlExport.notice.params)`,
  and add `accessibilityLiveRegion="polite"` so progress and the result are announced. Keep
  `opml-export-error`, rendering `t(opmlExport.errorKey)`.
- The Import card is unchanged: still disabled signed out, because import runs on the server.

**`AccountAccessPanel.tsx`**

- Delete `handleExportOpml` and its `isExporting` state; use `useOpmlExport()` (the panel is
  shown signed in, so `source` is `'account'`).
- The panel has one notice slot and one error slot shared with Download My Data. The notice slot
  renders `t(opmlExport.notice.key, opmlExport.notice.params)` when `opmlExport.notice` is set,
  else `t(noticeKey)` when set; the error slot renders `opmlExport.errorKey ?? errorKey`. Its OPML
  button calls `setNoticeKey(null); setErrorKey(null); void opmlExport.exportOpml();`, and
  `handleDownload` calls `opmlExport.clearStatus()` before it starts, so only the latest action's
  message shows.
- Keep `testID="account-access-opml"`, its label, and its `disabled` / `loading` wiring, reading
  the hook's `isExporting`.

### 7. Copy

Mobile layer, `packages/i18n-catalog/mobile/originals/*.json`, under `settings.opml` (the consumer
layer owns the other `settings.opml.*` keys; these leaf paths are new and exist nowhere else).
All are sentences, so sentence case (**ui-copy-casing**). The plural strings are one ICU block
each, variable `count`.

| Key | en-US |
| --- | --- |
| `export_description_device` | Export the podcasts you subscribed to and the Add by RSS feeds on this device as an OPML file. |
| `export_device_empty` | There are no subscriptions or Add by RSS feeds on this device to export. |
| `export_device_looking_up` | Looking up podcast feeds: {done} of {total} |
| `export_device_partial` | {count, plural, one {Exported, but # podcast you subscribed to was left out because its feed URL couldn't be loaded. Export again later to include it.} other {Exported, but # podcasts you subscribed to were left out because their feed URLs couldn't be loaded. Export again later to include them.}} |
| `export_device_offline_mode` | {count, plural, one {Exported your Add by RSS feeds. Offline Mode is on, so # podcast you subscribed to was left out. Turn off Offline Mode and export again to include it.} other {Exported your Add by RSS feeds. Offline Mode is on, so # podcasts you subscribed to were left out. Turn off Offline Mode and export again to include them.}} |
| `export_device_offline_mode_unavailable` | Offline Mode is on. Turn it off to export the podcasts you subscribed to, because their feed URLs are looked up online. |
| `export_device_lookup_failed` | Couldn't load the feed URLs of the podcasts you subscribed to, so nothing was exported. Check your connection, then try again. |

Write `es`, `fr`, and `el-GR` translations in the same layer, each language's own sentence case,
with the same placeholders and the same single ICU block where en-US has one. Keep
"Add by RSS", "Offline Mode", "OPML", and "URL" as written. Do not touch `overrides/` or
`compiled/`. The catalogs are large files (**large-file-reading**): Grep the `"settings"`
object, insert the new `"opml"` block beside its siblings with StrReplace, and never rewrite a
catalog file.

## What must stay true

- Signed-in export output is unchanged: same server route, same file name, same share call, same
  success notice.
- The device export holds the signed-out user's followed Add by RSS feeds and every directory
  subscription whose feed URL the route returned, directory first, and never a username or
  password.
- At most `DIRECTORY_FEED_URL_LOOKUP_CONCURRENCY` lookups are in flight. A 429 pauses every
  worker; nothing retries in a tight loop.
- Offline Mode makes no lookup request.
- When lookups fail, the file still holds what was found, and the message gives the number of
  directory podcasts left out.
- Leaving the screen mid-export writes no file and opens no share sheet.
- Web is unchanged. Web has no signed-out library, so it has no device export; this is an
  intentional divergence (**cross-surface-change-impact**).

## Tests

- `packages/helpers/src/lib/opml/generateOpml.test.ts` — the two moved cases.
- `apps/mobile/src/lib/opml/opmlExportFile.test.ts`:
  - both lists empty → null;
  - one directory feed and two Add by RSS feeds (one with a null title) → three `xmlUrl`
    outlines, the directory outline first, the null title falls back to the URL;
  - directory feeds only → a file with no Add by RSS outline;
  - `opmlExportFilename(new Date('2026-11-12T08:00:00Z'))` is
    `podverse-opml-export-2026-11-12.opml`.
- `apps/mobile/src/lib/opml/directoryFeedUrlLookup.test.ts`, with a fake `lookup`, a fake clock,
  and a `sleep` that advances the clock:
  - all found → `found` in `entries` order even when the fake resolves out of order, and
    `missingCount` 0;
  - a `missing` answer and a null title → one left out, the local title used for the other;
  - ten entries → never more than four calls in flight at once;
  - one `rate_limited` (5000 ms) then found → the entry is retried once, `sleep` received the
    wait, and it ends in `found`;
  - the same entry rate-limited twice → the run stops and every entry without an outcome counts
    as left out;
  - a `rate_limited` wait over 60000 ms → the run stops;
  - `unreachable` on the second entry → no new call starts, and the rest count as left out;
  - an aborted signal → `null`;
  - empty `entries` → `{ found: [], missingCount: 0 }` and `onProgress` not called;
  - progress: first call `(0, n)`, at most one call per 500 ms of fake time, last call `(n, n)`.
- Maestro `apps/mobile/e2e/opml-signed-out.yaml` (new). One platform proves the wiring
  (**mobile-test-economics**); use `${TIMEOUT_*}` from `shared/timeouts.env`
  (**mobile-maestro-timeouts**). Signed out throughout; never runs a login subflow.
  1. `runFlow: shared/launch-and-connect.yaml`.
  1. Empty device: `tab-more` → `more-nav-opml` → assert `more-opml-screen`; assert
     `opml-export-button` with `enabled: true`; tap it; assert `opml-export-notice` with text
     "There are no subscriptions or Add by RSS feeds on this device to export."; screenshot
     `opml-signed-out-empty`; `runFlow: shared/stack-back.yaml`.
  1. Subscribe signed out, copying `subscriptions-anonymous.yaml`: `tab-home` →
     `home-list-empty-search` → `search-input` → `inputText: podcast` → tap
     `search-result-row-0` → assert `podcast-detail-screen` → tap
     `podcast-detail-subscribe-toggle` → assert "Unsubscribe".
  1. `tab-more` → `more-nav-opml` → tap `opml-export-button` → `extendedWaitUntil`
     `opml-export-notice` with text "OPML Export Downloaded Successfully." (`${TIMEOUT_SLOW}`).
     This proves the lookup found the seeded channel's feed URL. Screenshot
     `opml-signed-out-exported`. `runFlow: shared/stack-back.yaml`.
  1. Offline Mode: on More, tap `more-offline-mode-switch`; `more-nav-opml` → tap
     `opml-export-button` → assert `opml-export-error` with the
     `export_device_offline_mode_unavailable` text. Screenshot `opml-signed-out-offline-mode`.
     `runFlow: shared/stack-back.yaml`, tap `more-offline-mode-switch` again so the device
     leaves Offline Mode.
- `scripts/mobile/e2e-test.sh`: add `opml-signed-out` to `flow_needs_e2e_api`, after `opml`
  (Search and the channel route need the E2E API). It fetches no `:2111` feed.
- `.cursor/skills/mobile-test-economics/SKILL.md`: add `opml-signed-out` after `opml` in the
  "Sync and offline" row's area list.
- The signed-in path stays covered by `apps/mobile/e2e/opml.yaml`, unchanged. The signed-out
  export of Add by RSS feeds is also exercised by plan 71's `signup-add-by-rss-limit.yaml`.

## Release scratchpad

```markdown
## Signed-out Export OPML on mobile

- Surfaces: mobile, api (refactor only)
- Change: More › OPML › Export OPML now works signed out on mobile, and so does the Export OPML
  button on the sign-up warning. The phone builds the file from every feed the signed-out user
  follows: the Add by RSS feeds on the device, plus each directory subscription, whose feed URL
  it looks up from the public `GET /channel/:idOrIdText` route, four calls at a time, waiting out
  a 429. While it looks up feeds the screen shows "Looking up podcast feeds: N of M". When some
  lookups fail, the file holds what was found and the message says how many directory podcasts
  were left out. In Offline Mode it makes no lookups: it exports the Add by RSS feeds and says how
  many directory podcasts were left out, or asks to turn Offline Mode off when there are no Add by
  RSS feeds. Signed in, Export OPML still downloads the account's export from the server. The
  OPML generator moved from the API into `@podverse/helpers`; the API's export is unchanged.
- Who notices: signed-out mobile users who subscribe or use Add by RSS
- Operator steps: none
```
