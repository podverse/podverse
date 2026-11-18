# v4 download carryover — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

Runs in this checkout on `feature/v4-migration-followups`. Twelve plans, seven phases.
Phases run in order. Prompts under one phase run at the same time. Their files are disjoint.

## Rules for every prompt

- Read and execute your plan. The settled choices are the plan you are executing and
  `00-REQUEST.md` § Review of the first planning pass. `00-SUMMARY.md` § Decisions to review
  is the first-pass record, including choices the operator later reversed. Do not implement a
  reversed choice from that section.
- When the code disagrees with a path or a line number, trust the code, keep the plan's intent,
  and say what differed in your final message.
- Do not run tests, lint, or Maestro. Do not run `git commit`, `git push`, `gh`, `npm publish`,
  or release scripts.
- Comments follow **comments-future-forward**. English UI chrome is title case.
- A prompt that shares its phase with another edits only the files in its plan's `## Files`.
  It does not edit `release-notes/scratchpad.md`. It puts its release-notes entry in its final
  message under "Release notes entry". It reports errors in files it does not own and does not
  fix them.
- A prompt that runs alone appends its own `## Release scratchpad` entry when that section is
  not `none`.
- The last prompt appends the parallel prompts' entries, archives the set, and ends with
  § Cumulative verification. It does not run those commands.

## Files that later prompts also edit

Each prompt inserts. None of these files is rewritten whole.

| File | Order |
| --- | --- |
| `apps/mobile/src/data/db/migrations.ts`, `schema.ts`, `migrations.test.ts` | 30, then 21, then 32. Each takes the next version. Version 4 is the latest in the tree at assemble time, so the expected numbers are 5, then 6, then 7. If the tree is already past 4, the plan's own "next version" rule wins. |
| `apps/mobile/src/data/customApiLocalClearPlan.test.ts` | 30, then 21 |
| `apps/mobile/vitest.config.ts` | 20, then 21, then 41, then 42 |
| `packages/i18n-catalog/mobile/originals/*.json` and `overrides/{es,fr,el-GR}.json` | 40, then 60 |
| `apps/mobile/src/downloads/README.md` | 30, then 42, then 60 |
| `apps/mobile/src/downloads/downloadManager.ts` | 42, then 60 |
| `apps/mobile/src/lib/playback/resolvePlaybackUrl.ts` and its test, `PlaybackProvider.tsx` | 32, then 60 |
| `apps/mobile/src/lib/addByRss/localEpisode.ts` and its test, `addByRssRepository.ts`, `downloadsRepository.ts` | 30, then 32 |
| `release-notes/scratchpad.md` | Alone prompts 21 and 42 append their own entries. The last prompt appends the entries from prompts 10, 20, 30, 31, 32, and 60. |

## Phases

| Phase | Prompts | Model · reasoning | Why this phase |
| --- | --- | --- | --- |
| 1 | 10, 20, 30, 50 at once | extra high, high, extra high, extra high | No shared files. 30 takes the next SQLite version. |
| 2 | 21 | Cursor Grok 4.7 · extra high | After 20 (file helpers, vitest include) and 30 (migration number). |
| 3 | 32, 40 at once | extra high, medium | After 21 and 30. Schema and playback stay with 32. Catalogs and the carryover repository stay with 40. |
| 4 | 31, 41 at once | extra high, extra high | After 32 and 40. Promotion files stay with 31. The decision module and vitest include stay with 41. |
| 5 | 42 | Cursor Grok 4.7 · extra high | After 31 and 41. This is the pass that moves and deletes files. |
| 6 | 51, 60 at once | high, extra high | After 42. The new Maestro flow stays with 51. The folder setting, catalogs, and playback edits stay with 60. |
| 7 | Close | Cursor Grok 4.7 · low | Alone. Archives the set and lists verification. |

### Phase 1 owns

- **10:** the legacy episode lookup route, its DTO, the ORM service, OpenAPI, and the request helper. Not `release-notes/scratchpad.md`.
- **20:** `apps/mobile/modules/podverse-legacy-storage/`, `v4DownloadNames.ts`, `v4DownloadFiles.ts`, and `apps/mobile/vitest.config.ts`.
- **30:** the local-episode table and repository, the Add by RSS screens it lists, `downloads/README.md`, and `.cursor/rules/add-by-rss-data-contracts.mdc`.
- **50:** `tools/test-assets/assets/e2e/v4-carryover/podcasting20.xml` and `tools/web/seed-e2e.mjs`.

### Phase 3 owns

- **32:** the keep-on-refresh column, `channelItemWindow.ts`, `channelItemsRepository.ts`, `resolvePlaybackUrl.ts`, and `PlaybackProvider.tsx`.
- **40:** `v4DownloadCarryoverRepository.ts` statuses, `syncEventLog.ts`, `errorLogPresentation.ts`, `syncJobKinds.ts`, and the mobile catalog originals and overrides.

### Phase 4 owns

- **31:** `addByRssPromotionRemap.ts`, its test, and `addByRssPromotion.ts`.
- **41:** `planV4DownloadCarryover.ts`, its test, and the vitest include line.

### Phase 6 owns

- **51:** `e2eFixture.ts`, the fixture-files marker, `navigation/index.tsx`, `App.tsx`, `apps/mobile/e2e/v4-download-carryover.yaml`, `scripts/mobile/e2e-test.sh`, `HOW-TO-RUN.md`, and `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`.
- **60:** the chosen-folder modules, `downloadStorage.ts`, `downloadManager.ts`, `downloads/README.md`, download prefs, the playback files plan 32 already edited, `MoreSettingsDownloadsScreen.tsx`, `apps/mobile/e2e/settings-downloads.yaml`, and the mobile catalogs.

## Close

The last prompt does only this:

1. Append each "Release notes entry" from prompts 10, 20, 30, 31, 32, and 60. Their final
   messages are in `.artifacts/plan-runner/v4-download-carryover/`. Prompts 21 and 42 already
   appended theirs. Skip an entry that is already in `release-notes/scratchpad.md`. Leave
   entries that were in the file before this set.
2. Move `.llm/plans/active/v4-download-carryover` to `.llm/plans/completed/v4-download-carryover`.
3. Do not change product code and do not run tests. End the message with § Cumulative
   verification, exactly as written, including the tab labels.

## Cumulative verification

The operator runs this once, after Close. Do not run it between prompts.

Plan 20 adds the Android module `podverse-legacy-storage`, and plans 30, 21, and 32 add SQLite
migrations, so the E2E dev clients need a rebuild before Maestro. Plan 50 changes the shared
web seed, so the web report is the full suite.

**Root** tab:

```bash
npm run build:packages
npm run i18n:compile
npm run i18n:validate
npm run lint
npm run type-check:mobile
npm run test -w packages/orm -- src/services/legacy/legacyEpisodeLookup.test.ts src/services/legacy/legacyPodcastLookup.test.ts
npm --prefix apps/mobile run test
npm run test -w apps/api -- src/test/legacy-episode-lookup.integration.test.ts src/test/legacy-podcast-lookup.integration.test.ts
make e2e_test_report
open .artifacts/e2e-reports/latest/index.html
```

**Mobile** tab (one-shot, after the Root block):

```bash
npm run mobile:prebuild
```

**Mobile E2E iOS** (exits; **Mobile E2E Metro** must already be up):

```bash
npm run mobile:e2e:ios
```

**Mobile E2E Android** (exits; **Mobile E2E Metro** must already be up):

```bash
npm run mobile:e2e:android
```

**Mobile Maestro** tab. **Mobile E2E Metro**, **Mobile E2E API**, and **Mobile E2E test-assets**
must already be up, and the two installs above must have finished. See
[HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md). API-backed `mobile:e2e:test` seeds before Maestro.

```bash
npm run mobile:e2e:test -- v4-download-carryover,settings-downloads,v4-carryover-anonymous
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
