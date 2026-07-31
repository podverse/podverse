# COPY-PASTA — mobile-unified-subscriptions

Paste one prompt at a time, in order. The plan files in this directory are the source of truth.
**Step 1 must land first** (Home, Library, and the car set all consume its repository).

Agent policy: implement locally; do **not** run test/lint/E2E suites; end each response with the
operator's verification steps. Git/`gh` are operator-only.

After each prompt completes: flip the master-plan step to `done` (Tracks + Appendix C), set the
matching `details/NNN` header to `done`, and tick the box here. When a track's steps are all done,
re-append ` (DONE)` to its heading. After all three steps are `done`, archive this set to
`completed/`.

---

## Step 1 — Unified subscriptions repository (9b.8)  [x]

```
Read and execute .llm/plans/active/mobile-unified-subscriptions/01-subscriptions-repository.md.
Create apps/mobile/src/data/repositories/subscriptionsRepository.ts as the single source of truth
that merges directory follows (account_following_channels, hydrated via reqChannelGetMany — batch,
soft-fail, no raw fetch, reuse the /auth/me auth-refresh path) with add-by-RSS follows (from
addByRssRepository) into one deduped, alphabetical, filterable list (all | addByRss | directory).
Persist directory display fields in a small subscribed_channel SQLite cache so list() works offline;
call syncFromAccount from accountRepository after the snapshot save without ever throwing out of
saveSnapshot. Add unit tests for merge + dedupe + each filter + title-required drop + offline
fallback. Do not change the server /auth/me payload. End with the scoped unit test command for me.
Cursor model: Opus 4.8
Reminder: do not run tests during agent work; I will verify at the end.
```

Result / notes: Done. New pure `subscriptionsMerge.ts` (map/merge/dedupe/filter/sort) +
`subscriptionsRepository.ts` (SQLite `subscribed_channel` cache + `reqChannelGetMany` type:subscribed
hydration, soft-fail). Wired `syncFromAccount(account, context)` into `accountRepository.refresh` and
`clearCache()` into `clearSnapshot`. Migration v6 adds `subscribed_channel`. Unit tests in
`subscriptionsMerge.test.ts` (added to vitest include). Directory hydration uses the subscribed-list
endpoint (page 1, podcasts medium) — pagination + music medium are follow-ons.

---

## Step 2 — Home subscribed mixed + filter (8.16)  [x]

```
Read and execute .llm/plans/active/mobile-unified-subscriptions/02-home-subscribed-mixed-filter.md.
In apps/mobile/src/screens/home/homeFeedData.ts, make the authenticated Podcasts subscribed view
source rows from subscriptionsRepository.list({ filter }) (mixed by default) instead of
reqChannelGetMany({ type: 'subscribed' }); leave the anonymous global path and other media types
unchanged. Add an All / Add-by-RSS filter chip for that view, persist the choice in device prefs
(reuse the preferredMediaType pattern), route directory rows to Podcast detail and add-by-RSS rows
to the add-by-RSS detail by SubscribedChannel.source, and localize the filter labels via t(). End
with the focused mobile E2E command + report path for me.
Cursor model: Codex 5.3
Reminder: do not run tests during agent work; I will verify at the end.
```

Result / notes: Done. `fetchHomeFeedRows` now sources the authenticated Podcasts view from
`subscriptionsRepository.list({ filter })` (mixed by default) and carries `SubscribedChannel.source`
on each row; anonymous global + other media types unchanged. Added persisted
`prefs/homeSubscriptionFilter.ts` (`all` | `addByRss`, key `home.subscriptionFilter`) and an All /
Add-by-RSS chip rendered only for the authenticated Podcasts view. Row tap routes directory →
`PodcastDetail`, add-by-RSS → the RSS tab (cross-tab via typed `getParent`; no dedicated add-by-RSS
detail screen exists yet — follow-on). New i18n keys `subscriptions.filter.all` /
`subscriptions.filter.add_by_rss` across all four consumer locales. `home.yaml` exercises the filter.

---

## Step 3 — My Library Subscriptions list (9.30)  [x]

```
Read and execute .llm/plans/active/mobile-unified-subscriptions/03-library-subscriptions-list.md.
Add a My Library Subscriptions entry + screen that lists subscriptionsRepository.list({ filter })
(directory + add-by-RSS mixed by default, alphabetical), reusing the same All / Add-by-RSS filter
control and i18n keys from Home. Route rows by source (directory → Podcast detail, add-by-RSS →
add-by-RSS detail), register the route + hub entry in navigation/index.tsx with a testID, and match
existing library list empty/loading/error states. Localize all copy via t(). Then flip 9.30 to done
(and 8.16 / 9b.8 if not already), re-append (DONE) to the Track 8/9/9b headings whose steps are all
done, and archive this plan set to completed/. End with the focused mobile E2E command + report
path for me.
Cursor model: Codex 5.3
Reminder: do not run tests during agent work; I will verify at the end.
```

Result / notes: Done. New `LibrarySubscriptionsScreen` lists `subscriptionsRepository.list({ filter })`
(directory + add-by-RSS mixed by default, alphabetical) via `MobileScreenContainer` + `Card`/`ListRow`
+ `AuthAwareLoadState` (auth-required/empty/loading/error parity with other library lists). Extracted
the Home filter into shared `components/subscriptions/SubscriptionFilterControl` and generalized prefs
to `prefs/subscriptionFilter.ts` (shared type + Home and Library keys); Home now consumes both.
Registered `LibrarySubscriptions` + `PodcastDetail` in the Library stack (routes, param list, linking,
screens) and added a `library-nav-subscriptions` hub entry. Rows route directory → Library
`PodcastDetail`, add-by-RSS → RSS tab (typed `getParent`). Reused `subscriptions.*` i18n (no new keys
beyond the Home filter keys). E2E: new `library-subscriptions.yaml`. Flipped 9.30/8.16/9b.8 to done and
re-appended (DONE) to Track 8 and Track 9 headings (Track 9b already DONE). Set archived to `completed/`.

---

## Cumulative operator verification (run after the last step)

Prereq in named tabs (see vscode-terminals-commands / HOW-TO-RUN.md):

- **Mobile Metro:** `npm run mobile:dev`
- **Mobile iOS** / **Mobile Android**: a device up for the E2E runs

```bash
# Mobile — scoped unit test for the shared repository (standalone install → --prefix, not -w)
npm --prefix apps/mobile run test -- subscriptionsRepository

# Mobile Maestro — focused E2E for the wired surfaces
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- library
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
