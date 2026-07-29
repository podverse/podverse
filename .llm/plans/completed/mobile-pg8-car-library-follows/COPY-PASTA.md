# COPY-PASTA — mobile-pg8-car-library-follows

Paste one prompt at a time, in order. The plan files in this directory are the source of truth.

Agent policy: implement locally; do **not** run test/lint/E2E suites; end each response with the
operator's device verification steps. Git/`gh` are operator-only.

After each prompt completes: flip the master-plan step to `done` (Tracks + Appendix C), set the
matching `details/NNN` header to `done`, and tick the box here. After **both** steps are `done`,
append ` (DONE)` to the `## Track 12 …` heading and archive this set to `completed/`.

---

## Step 1 — Project merged subscriptions + playlists into car library (12.22)  [x]

**Prereq:** 9b.8 / 600 (`subscriptionsRepository`) from the `mobile-unified-subscriptions` set must
be done first — this step consumes it.

```
Read and execute .llm/plans/active/mobile-pg8-car-library-follows/01-project-directory-follows-and-playlists.md.
Rebuild the mobile account repository's car/watch library-browse projection to map
subscriptionsRepository.list() (the shared merged directory + add-by-RSS follows from 9b.8/600) to
podcast browse nodes, PLUS project followed playlists (account_following_playlists) hydrated via
reqPlaylistGetMany (batch, soft-fail, no raw fetch). Merge + dedupe by idText, then project. Do NOT
re-implement channel merge/hydration here (it lives in subscriptionsRepository). Add a unit test for
the channel-list + playlist mapping/merge. Do not change the server /auth/me payload and do not touch
the native browse tree. End with the DHU + scoped unit test steps for me to run.
Cursor model: Opus 4.8
Reminder: do not run tests during agent work; I will verify at the end.
```

Result / notes:

- New pure module `apps/mobile/src/data/repositories/libraryBrowseProjection.ts` with
  `mapSubscribedChannelToNode`, `mapPlaylistToNode` (title+id_text required, drops otherwise;
  playlists have no DTO artwork → `null`), and `mergeLibraryBrowseNodes` (concat channels-first,
  dedupe by `idText`). Types-only imports → node-only Vitest safe.
- `accountRepository.projectLibraryBrowseForAccount(account, context)` now reads
  `subscriptionsRepository.list()` for channel nodes and hydrates followed playlists via
  `reqPlaylistGetMany({ type: 'private_followed', sort: 'a_z', medium: 'all' })` (server-derived from
  `account_following_playlists`; no raw fetch). Channel-list and playlist hydration soft-fail
  independently; empty `account_following_playlists` skips the playlist request.
- Projection moved from `saveSnapshot` → `refresh` (after `syncFromAccount`) so the merged list
  includes freshly hydrated directory follows and `context` is available for playlist hydration.
  `saveSnapshot` (only caller: `refresh`) no longer projects. `clearSnapshot` unchanged (still clears
  the index + `subscriptionsRepository.clearCache()`).
- Unit test `libraryBrowseProjection.test.ts` added + registered in `vitest.config.ts` (mappers,
  title/id_text drop, merge order, dedupe-first-wins, empty). No `/auth/me` payload or native browse
  tree changes.

---

## Step 2 — Car parallel-worktree operator doc (12.21)  [x]

```
Read and execute .llm/plans/active/mobile-pg8-car-library-follows/02-car-parallel-worktree-operator-doc.md.
Create docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md (Appendix D
template, Status: done) with concise operator guidance for running Track 12 car native work in a
sibling git worktree — link the mobile-worktree-scope and git-worktree-sibling skills, note that
ios/ and android/ are gitignored prebuild output (regenerate via mobile:prebuild, config plugins
only), one device per worktree, and the DHU / CarPlay simulator proof gates. Docs only, no code.
Then flip 12.21 + 12.22 to done, add (DONE) to the Track 12 heading, and archive this plan set to
completed/.
Cursor model: Auto
Reminder: do not run tests during agent work; I will verify at the end.
```

Result / notes:

- Created `docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md`
  (**Status: done**): concise operator guide linking **git-worktree-sibling** +
  **mobile-worktree-scope**, with car-specific notes (`ios/`/`android/` are gitignored prebuild →
  `mobile:prebuild`, config plugins only; one device per worktree; App Group + native-cache schema
  invariants) and the DHU / CarPlay proof-gate checklists. Docs only, no code.
- Flipped 12.21 + 12.22 to `done` (Tracks + Appendix C), added ` (DONE)` to the Track 12 heading,
  and refreshed the stale "remaining car follow-ons" note (Track 12 complete). Archived this set to
  `completed/`.

---

## Cumulative operator verification (run after the last step)

Prereq in a named tab (see vscode-terminals-commands / HOW-TO-RUN.md):

- **Mobile Metro:** `npm run mobile:dev`

```bash
# Mobile — scoped unit test for the projection mappers (standalone install → --prefix, not -w)
npm --prefix apps/mobile run test -- libraryBrowseProjection

# Mobile Android — install dev build, follow a directory channel + a playlist in-app, then prove
# app-closed car browse in the Desktop Head Unit
npm run mobile:android -- --device Pixel_6_Pro_API_33
adb shell am force-stop com.podverse.app.next
# Launch DHU and confirm the Library node lists the followed directory channel + playlist
# (apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md)

# Docs — confirm the 12.21 detail doc exists and is marked done
test -f docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md
grep -n 'Status:.*done' docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md
```
