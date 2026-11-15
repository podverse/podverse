# 06 — Mobile: Continue Migration screen with OPML export

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Gate — check before anything else

Open doc 08 § Open questions, second bullet ("Feed-list field spike, per platform").

- Still "Not run": change nothing and end with
  `RUNNER-STATUS: BLOCKED — feed-list field spike not recorded in doc 08 § Open questions`.
- Recorded, and no platform produced an outline: build nothing. Doc 08 says no outline means no
  screen. Write one line under that bullet, "Screen not built: the spike produced no outline.",
  and finish normally.
- At least one platform produced an outline: continue.

Also confirm 04 and 05 finished (`v4CarryoverRepository.ts` and `runV4Carryover.ts` exist);
otherwise end with the storage-spike `RUNNER-STATUS: BLOCKED` line from 04.

## What this does

Builds the screen in doc 08 § Screen, after the spike. It paints from the staged rows (no network
request), lets the person share an OPML file of the shows on this phone, and starts the phone copy
only when they tap Continue Migration.

## Rows

R5

## Runs after

05.

## Files

- `apps/mobile/src/screens/migration/V4ContinueMigrationScreen.tsx` (new)
- `apps/mobile/src/migration/v4/carryoverOutlines.ts` (new, pure) and its test
- `apps/mobile/src/migration/v4/readV4LocalState.ts` (when `copy_allowed` is set)
- `apps/mobile/src/data/repositories/v4CarryoverRepository.ts` (`listOutlineSources()`)
- `apps/mobile/src/navigation/index.tsx` and the root stack that hosts full-screen modals
- the after-first-paint startup spot 04 used (open the screen once)
- `packages/i18n-catalog/mobile/originals/{en-US,es,fr,el-GR}.json` (then `npm run i18n:compile`)
- `apps/mobile/e2e/v4-carryover-anonymous.yaml`
- `release-notes/scratchpad.md`

## 1. Outlines

`carryoverOutlines.ts` `buildCarryoverOutlines(rows)` returns `{ directoryFeeds, addByRssFeeds,
skipped }` as `DeviceOpmlFeed[]` (`apps/mobile/src/lib/opml/opmlExportFile.ts`). A `podcast` row
needs both `cached_title` and `cached_feed_url`; an `add_by_rss` row needs `cached_title` (its
`legacy_id` is the URL). Rows missing either are counted in `skipped`. The file is
`buildDeviceOpmlExport({ directoryFeeds, addByRssFeeds })`.

## 2. When `copy_allowed` is set

Change `runV4CarryoverReadOnce` (04): after `saveRead`, set `copy_allowed` only when
`buildCarryoverOutlines` returns zero outlines. Otherwise leave it unset; the screen sets it.

## 3. Screen

Open it once per launch, after first paint, while all hold: signed out, `read_at` set,
`copy_allowed` unset, at least one outline. Full-screen modal on the root stack. It must not
block sign-in: the header has Sign In, which opens the existing sign-in screen.

Content (titles in title case, sentences in sentence case; **ui-copy-casing**,
**even-content-spacing**):

- Title: `Save Your Podcast List`
- Body: `This file is the list of shows on this phone. It does not include playlists, clips, your
  queue, history, playback positions, downloaded files, or your membership. If you had an account,
  signing in copies those, on this phone or on the website, and does not wait for this screen.`
- Button `Export OPML`: shares the file the same way the More → Export OPML action does (reuse its
  share helper; find it with `rg -n "opmlExportFilename" apps/mobile/src`).
- Checkbox: `I saved a copy, or I want to continue without one`
- Primary button `Continue Migration`, disabled until the checkbox is checked. On tap:
  `setCopyAllowed()`, request a sync run, close the screen.

Every control has an accessible name (**screen-reader-accessibility**). Use shared mobile
components (**mobile-reusable-components**) and theme tokens (**mobile-theme-parity**).

## 4. Maestro

Update `v4-carryover-anonymous.yaml`: after the fixture deep link, assert the screen title, tap
the checkbox, tap Continue Migration, then the existing Library assertions. Do not tap Export
OPML (the share sheet is outside the app).

## Tests

`carryoverOutlines.test.ts`: rows with and without title or URL, both kinds, empty input.

## Release scratchpad

```markdown
## Mobile asks signed-out v4 users to save an OPML file before the carryover

- Surfaces: mobile
- Change: after updating from v4, a signed-out phone with readable v4 shows opens Save Your
  Podcast List first. Export OPML shares the list of shows on the phone; Continue Migration (after
  ticking the checkbox) starts the carryover. Sign In stays available.
- Who notices: signed-out v4 users after the update
- Operator steps: none
```
