# Directory popularity above zero — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above each fence).
1. Copy the fenced block only, paste, and the agent runs it.
1. Tick the box when that prompt is done.

Request and settled review answers: [00-REQUEST.md](./00-REQUEST.md). Ledger and decisions:
[00-SUMMARY.md](./00-SUMMARY.md). Order and file ownership:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

**Run the set unattended (Root tab, in this worktree):**
`./scripts/abcplan/run.sh run directory-popularity-above-zero`. It runs one fresh agent per prompt
on that prompt's model, stops at the first blocker, and resumes with
`./scripts/abcplan/run.sh run directory-popularity-above-zero --resume 'Your answer.'`. The script
passes `--parallel`, so every prompt under one phase heading runs at once. Prompts under one
heading share no file, and none of them writes the release scratchpad: each puts its entry in its
final message, and Close appends them. Running them one after the other is also correct.

**Optional — one chat runs the whole set:** paste
`Orchestrate .llm/plans/active/directory-popularity-above-zero/ with .cursor/prompts/plan-orchestrator.md.`
(Cursor Grok 4.7 · medium). It stops at the first blocker. Use the prompts below instead when
you want to read each result before the next prompt starts.

Phases run in order; prompts inside a phase run at once.

| Phase | Prompts | Model and reasoning |
| --- | --- | --- |
| 1 | 10, 40 | 10 Cursor Grok 4.7 extra high; 40 Cursor Grok 4.7 medium |
| 2 | 20, 31 | 20 Cursor Grok 4.7 high; 31 Cursor Grok 4.7 extra high |
| 3 | 21, 32 | 21 Cursor Grok 4.7 extra high; 32 Cursor Grok 4.7 high |
| 4 | 30, 11, 41 | 30, 11 Cursor Grok 4.7 medium; 41 Cursor Grok 4.7 high |
| 5 | Close | Cursor Grok 4.7 low |

Every prompt is Cursor Grok 4.7: each plan settles its choices and follows an existing pattern.
10 and 21 run at extra high because they change API list contracts that web and mobile build on
(10 keeps the recent fill for live-item and subscribed Top while dropping it for directory Top;
21 adds a route, a shared request helper branch, and a real-database test). 31 runs at extra high
because its E2E seed rows are the invariant plans 30, 32, and 41 rely on. 20, 32, and 41 are
pattern-following changes across several files. 40, 30, and 11 are small or mechanical. Fast
stays off.

If a Cursor Grok 4.7 prompt stalls or makes the same mistake twice, rerun it one reasoning level
higher (after extra high, **Codex 5.3 · high**), and record the change on the prompt here.

## Phase 1

Two prompts at once. 10 owns the channel and item controllers, their read test, and
`apps/api/openapi.yml`; 40 owns the mobile `ListSortChip`, the form barrel, and `HomeSortChip.tsx`
(see 00-EXECUTION-ORDER.md § Phase 1).

- [x] **10 — API channel and item directory Top returns ranked rows only**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/10-api-channel-item-directory-top-ranked-only.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D1 changed: live-item
global and category Top keep the recent fill; D2: a channel's episode Top keeps it too).
Only /channel and /item global and category Top become ranked-only. Subscribed Top, a channel's
episode Top, and /live-item/global/top and /live-item/category/top keep fillTopPage. Do not edit
packages/helpers/src/lib/topListFill.ts. apps/api/openapi.yml is large: Grep the four directory
Top paths the plan names; plans 20 and 21 edit the same file after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Close appends it.
When the plan is done, move 10-api-channel-item-directory-top-ranked-only.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **40 — Mobile shared two-step sort chip**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/directory-popularity-above-zero/40-mobile-shared-list-sort-chip.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
No visible change: Home keeps every testID, label, accessible name, and behavior, so
apps/mobile/e2e/home.yaml passes unchanged. Export ListSortChip from the mobile form components
barrel; plan 41 builds Browse's chip on it.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 40-mobile-shared-list-sort-chip.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed (including ListSortChip's props), self-check
results, any blocker, and anything a later prompt needs.
```

## Phase 2

Two prompts at once. 20 owns the clip, playlist, and account popularity services and controllers,
`apps/api/openapi.yml`, and their API tests; 31 owns the web Browse dropdown configs and SSR
resolvers, the profiles page files, `tools/web/seed-e2e.mjs`, two web specs, and the web spec
order file (see 00-EXECUTION-ORDER.md § Phase 2).

- [x] **20 — Public clip, playlist, and profile Top return only counts above zero**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/20-api-clip-playlist-profile-top-above-zero.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D5: per-podcast and
per-episode clip Top keep zero-count rows; D6: owner and followed playlist Top are unchanged).
Only the public directory Top reads drop zero counts; subscribed clip and profile Top keep them.
Keep plan 10's edits in apps/api/openapi.yml; the file is large, so Grep the clip, playlist, and
account Top paths. Plan 21 edits the playlist controller, statsPopularityPlaylist.ts,
playlist.test.ts, and openapi.yml after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Close appends it.
When the plan is done, move 20-api-clip-playlist-profile-top-above-zero.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **31 — Web Browse lists open on Top for the past week, with seeded counts**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/31-web-browse-opens-top-week-and-seed.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D8 and D10 changed: every
Browse list opens on Top for the past week until the user changes that media type).
Public playlists and Browse Livestreams do not change here. Seed exactly the four popularity rows
the plan lists (two channels, two items; day 0, week 2, month 3, all time 5) and no others: plans
30, 32, and 41 and the mobile Browse flow rely on which lists are empty on Top / Week. Create
apps/web/e2e/browse-directory-top.spec.ts; plan 32 adds a second test to it, and plan 30 edits
media-list-chips.spec.ts after you.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Close
appends it.
When the plan is done, move 31-web-browse-opens-top-week-and-seed.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 3

Two prompts at once. 21 owns the public playlists Recent read in the ORM, API, OpenAPI, the
playlist request helper, and its API tests; 32 owns the web Browse list components,
`mediaListChips.ts` and its test, the four consumer catalog originals, and
`browse-directory-top.spec.ts` (see 00-EXECUTION-ORDER.md § Phase 3).

- [x] **21 — Public playlists Recent read**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/21-api-public-playlists-recent.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D3: only Recent; D4: order
by last_updated; D7: public Top and Recent both return last_updated and meta
{ page, count: null, limit }).
Keep plan 20's edits in the playlist controller, statsPopularityPlaylist.ts, playlist.test.ts, and
apps/api/openapi.yml; openapi.yml is large, so Grep /playlist/public/top. reqPlaylistGetMany with
type 'public' calls /playlist/public/recent only when sort is 'recent'; plans 30 and 41 build on
that. New id_text values in tests are 9–15 characters.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md: put the plan's release scratchpad entry in your final message under
"Release notes entry". Close appends it.
When the plan is done, move 21-api-public-playlists-recent.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **32 — Web Browse shows each media type's empty message**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/32-web-browse-empty-list-message.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D9 changed and D14 added:
reuse each media type's existing "No … Found" string; add new keys for artists and users).
Write each new consumer key in the en-US, es, fr, and el-GR originals with no empty strings; the
catalogs are large, so Grep the key prefix. Use title case for the labels. Keep plan 31's test in
apps/web/e2e/browse-directory-top.spec.ts and add yours beside it; expect the empty lists plan
31's seed leaves on Top / Week.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Close
appends it.
When the plan is done, move 32-web-browse-empty-list-message.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed (including the new catalog keys),
self-check results, any blocker, and anything a later prompt needs.
```

## Phase 4

Three prompts at once. 30 owns `PlaylistsPageDropdownConfig.ts` and `media-list-chips.spec.ts`;
11 owns `docs/features/POPULARITY-AND-TASTE-PROFILE.md`; 41 owns `browseListScope` in
`packages/helpers`, the helpers barrel, the mobile Browse screen files, `apps/mobile/e2e/browse.yaml`,
and `MOBILE-PERF-BASELINES.md` (see 00-EXECUTION-ORDER.md § Phase 4).

- [x] **30 — Web public playlists offer Recent**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/directory-popularity-above-zero/30-web-public-playlists-recent-sort.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D3: only Recent beside
Top; public playlists still open on Top / Week).
Use plan 21's reqPlaylistGetMany Recent branch as it stands in the tree. Keep plan 31's edits in
apps/web/e2e/media-list-chips.spec.ts. Do not edit playlistsListSsr.ts, playlists/page.tsx, or
PlaylistsPageChipRow.tsx.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Close
appends it.
When the plan is done, move 30-web-public-playlists-recent-sort.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **11 — Document above-zero directory Top for all five list types**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/directory-popularity-above-zero/11-docs-public-range-sorts-above-zero.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Replace only the body of § Public range sorts with the plan's text. Live-item global and
category Top keep the recent fill and are not in the above-zero list. Check the text against the
code plans 10, 20, and 21 left in the tree; if they disagree, describe the code and report the
difference.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 11-docs-public-range-sorts-above-zero.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **41 — Mobile Browse Recent sort, Top for the week, a sort per media type**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/directory-popularity-above-zero/41-mobile-browse-recent-sort.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D10 and D11 changed: every
media type opens on Top / Week and saves its own sort; D12: the ranked option is labelled Top;
D13: an empty Top list reuses Nothing to Show Yet).
Build the chip on plan 40's ListSortChip and the playlists Recent read on plan 21's
reqPlaylistGetMany, as they stand in the tree. Browse Maestro expectations follow plan 31's seed
rows; do not edit tools/web/seed-e2e.mjs, perf-browse-chip-switch.yaml, or home.yaml.
Livestreams keep no sort.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check, build, or formatter to them. Do not run tests. Do not edit
release-notes/scratchpad.md even though the plan lists it: put the plan's release scratchpad
entry in your final message under "Release notes entry". Close appends it.
When the plan is done, move 41-mobile-browse-recent-sort.md to
.llm/plans/completed/directory-popularity-above-zero/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 5

- [x] **Close — release entries, archive the set, cumulative verification**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** low

```
Close the plan set .llm/plans/active/directory-popularity-above-zero/.
Change no product, test, or guidance code. Do not run tests.

Append to the end of release-notes/scratchpad.md every "Release notes entry" from the final
messages of prompts 10, 20, 31, 21, 32, 30, and 41 in
.artifacts/plan-runner/directory-popularity-above-zero/ (10.md, 20.md, 31.md, 21.md, 32.md,
30.md, 41.md), in that order, unchanged, one blank line between entries. Skip an entry whose title
already appears in the scratchpad. When a final message has no entry, use the
## Release scratchpad block of that plan in
.llm/plans/completed/directory-popularity-above-zero/. Plans 11 and 40 have no entry. Never edit
or remove another change's entry.

Grep every final message in .artifacts/plan-runner/directory-popularity-above-zero/ for blockers
and for errors reported in files the prompt did not own, and list them in your final message.

Confirm 10, 11, 20, 21, 30, 31, 32, 40, and 41 are in
.llm/plans/completed/directory-popularity-above-zero/. If one is still in active/, stop and report
BLOCKED naming it. Then move 00-REQUEST.md, 00-SUMMARY.md, 00-EXECUTION-ORDER.md, and
COPY-PASTA.md there, and remove the empty active directory.

End with the cumulative verification for the whole set, assuming no earlier prompt was tested.
One fenced bash block per tab, fish-safe, labeled with the tab name, all run in the
../podverse_feature_directory_popularity_above_zero worktree. Tell the operator that Docker must
be running for the API tests and the web report, and that for the Mobile Maestro block Mobile E2E
Metro, Mobile E2E test-assets, and Mobile E2E iOS or Mobile E2E Android must already be running
from the worktree, and Mobile E2E API must be restarted after npm run build:packages so it serves
the new directory Top and public playlists Recent behavior. Do not put leave-running commands in
the blocks. Note that no plan adds a dependency or a migration, so there is no lockfile or linear
baseline step; that make mobile_e2e_seed reseeds the shared E2E database with plan 31's
popularity rows before Maestro; and that the main checkout's
.llm/plans/active/abcplan-directory-popularity-above-zero/ can be deleted by hand if it still
exists.

Root:
npm run i18n:compile
npm run i18n:validate
npm run build:packages
npm run lint
npm run type-check -w apps/web
npm run test -w packages/helpers
npm run test -w apps/web
make test_deps
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/media-list-chips.spec.ts,e2e/browse-directory-top.spec.ts,e2e/artists-list-date-and-view.spec.ts,e2e/playlists-profiles-chips.spec.ts,e2e/podcasts-subscribed-filter.spec.ts
open .artifacts/e2e-reports/latest/index.html

Mobile:
npm run type-check:mobile
npm --prefix apps/mobile run test

Mobile Maestro:
make mobile_e2e_seed
npm run mobile:e2e:test -- browse,home
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
