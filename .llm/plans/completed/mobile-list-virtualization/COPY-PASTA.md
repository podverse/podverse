# COPY-PASTA — mobile-list-virtualization

Run prompts **1 → 2 → 3** in order. Each: read its plan file, implement, check the box, and move the
finished numbered file to `.llm/plans/completed/mobile-list-virtualization/`.
**Agents: implement only — do not run tests.** The operator runs the verification block at the end.

Baseline remediation for master step **23.3(a)** / detail 597. Not the optional FlashList tuning (b).

## Leave-running (named tabs — start once, keep up)

**Mobile Metro**

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API**

```bash
npm run mobile:e2e:api
```

Phones installed once (rebuild after each screen change):

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

## Prompts

- [x] **Step 1 — Subscriptions → FlatList (highest priority).**

**Cursor model:** Codex 5.3 — RN list conversion, grid-aware, preserve testIDs/states.

```text
Read and execute .llm/plans/active/mobile-list-virtualization/01-subscriptions-flatlist.md
Convert LibrarySubscriptionsScreen from ScrollView+map to a grid-aware FlatList (header/filter in
ListHeaderComponent; stop wrapping the list in MobileScreenContainer's ScrollView). Preserve every
testID and the auth/empty/error/loading states. Mark done, move the plan file to completed/. Do not
run tests.
```

- [x] **Step 2 — PlaylistDetail (browse) + PodcastDetail episodes → FlatList.**

**Cursor model:** Codex 5.3 — split-aware FlatList + ListHeaderComponent; preserve testIDs.

```text
Read and execute .llm/plans/active/mobile-list-virtualization/02-playlist-and-podcast-flatlist.md
Convert the PlaylistDetail browse list and the PodcastDetail episode list to FlatList with headers in
ListHeaderComponent (PodcastDetail split-aware: right pane = list). Leave the playlist reorder path
as-is. Preserve podcast-detail-split / podcast-detail-screen / podcast-episode-row-<i> testIDs. Mark
done, move the plan file to completed/. Do not run tests.
```

- [x] **Step 3 — abcmemory rule + inventory confirm + archive.**

**Cursor model:** Codex 5.3 — abcmemory rule (.cursor/** only) + doc sync.

```text
Read and execute .llm/plans/active/mobile-list-virtualization/03-abcmemory-list-baseline.md
Add .cursor/rules/mobile-list-virtualization.mdc (mobile .tsx glob) enforcing FlatList/SectionList for
user-data lists, confirm detail 597's inventory, point AGENTS.md at the rule, then archive the whole
set to completed/ and update the master-plan 23.3 parenthetical. Do not run tests.
```

## After all complete (operator verification)

One-shots (**Mobile** tab) — leave-running **Mobile Metro** + **Mobile E2E API** up, phones
installed (`mobile:e2e:ios` / `mobile:e2e:android`):

```bash
npm run build:packages
npm run lint
npm run test -w apps/mobile
```

E2E (**Mobile Maestro** tab) — affected surfaces:

```bash
npm run mobile:e2e:test -- library-subscriptions
npm run mobile:e2e:test -- library-playlists
npm run mobile:e2e:test -- podcast-episode
npm run mobile:e2e:test -- tablet
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

(The `tablet` run needs the tablet devices + **Mobile E2E test-assets** if step 01 of the
tablet-followups set landed first; otherwise run it on the phone surfaces above.)
