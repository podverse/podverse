# COPY-PASTA — Home (podcasts), Search, foundations, and web counterparts

Paste one prompt per agent session, **top to bottom**. The numbering below is the run order — no
reordering needed. Dependencies and rationale: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
Locked decisions: [00-SUMMARY.md](00-SUMMARY.md).

Agents do **not** run tests during implementation — the operator verifies at the end.

**Why notifications is last:** prompt 17 is a dependency leaf and the only irreversible step in the
set (breaking ORM rename + linear migration). The legacy Notifications screen has not been reviewed
yet, so it sits at the end where a late change of mind is still cheap.

**This set is mobile-focused but not mobile-only.** Prompts 01, 02, 07, 13, 14, 16, and 17 change
`apps/api`, `packages/orm`, `packages/helpers`, `packages/helpers-requests`, `apps/web`, or
`apps/workers`. Verify those with Playwright (`make e2e_test_web_report_spec`), not Maestro.

| #   | Prompt                                | Surfaces            | Cursor model | Reasoning  |
| --- | ------------------------------------- | ------------------- | ------------ | ---------- |
| 01  | Access tiers and shared gating seam    | mobile, web, shared | Opus 5       | high       |
| 02  | Anonymous subscriptions + bulk follow  | mobile, api         | Opus 5       | high       |
| 03  | Fast startup and serial sync queue     | mobile              | Opus 5       | extra high |
| 04  | Sync progress indicator                | mobile              | Opus 5       | high       |
| 05  | Sync event log                         | mobile              | Opus 5       | high       |
| 06  | Offline content sync                   | mobile              | Opus 5       | high       |
| 07  | Channel seen state                     | mobile, api, orm    | Opus 5       | extra high |
| 08  | Home list and filter input             | mobile              | Codex 5.3    | high       |
| 09  | Home filter/sort screen                | mobile              | Codex 5.3    | medium     |
| 10  | Home row metadata                      | mobile              | Codex 5.3    | medium     |
| 11  | Home view toggle and overflow menu     | mobile              | Codex 5.3    | medium     |
| 12  | Search tab web alignment               | mobile              | Codex 5.3    | medium     |
| 13  | Web unseen episode indicator           | web                 | Opus 5       | high       |
| 14  | Web subscribed filter input            | web                 | Codex 5.3    | high       |
| 15  | Mobile per-instance sort prefs         | mobile, shared      | Opus 5       | high       |
| 16  | Web filter/sort persistence            | web, shared         | Opus 5       | high       |
| 17  | Notifications read/unread rename       | all surfaces        | Opus 5       | extra high |
| 18  | Record deferrals and close the set     | docs                | Auto         | low        |

---

- [x] **01 — Access tiers and shared gating seam** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/01-access-tiers-and-gating.md`

Landed as `packages/helpers/src/lib/accessTier.ts` (**not** `helpers-requests` as the prompt
assumed — the resolver is pure account derivation and belongs next to `deriveMembershipState`;
`helpers-requests` keeps only the HTTP-shaped `accessDenialReasonFromGate` bridge). Membership expiry
is in-app and on demand only — the previously built `membership-expiry-reminder` scheduled job and
worker handler were removed (rule `no-membership-expiry-notifications`). Auto-renew suppression stays
deferred (711).

- [x] **02 — Anonymous subscriptions and bulk follow endpoint** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/02-anonymous-subscriptions.md`

The merge model changed during execution on operator instruction: local subscriptions are pushed to
an account **only at sign-up**, never on a later sign-in, and after that the account is the source of
truth. That removed the additive merge (and with it the unsubscribe-resurrection problem) but means a
sign-in to an existing account replaces local rows with the account's. Sign-out now retains **all**
local data — subscriptions, add-by-RSS feeds, and the car browse index. New endpoint is
`POST /account/follow/channel/bulk`.

- [x] **03 — Fast startup and the serial sync queue** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/03-fast-startup-and-sync-queue.md`

The queue is `apps/mobile/src/sync/`, kept free of React Native imports so serialization, dedupe,
growing totals, and failure isolation are unit-tested in node; `SyncProvider` owns the triggers.
Bootstrap now reads SecureStore and the SQLite account snapshot only, so the 8s auth budget is gone
and a 20s per-job budget replaces it. The 401 that ends a dead session moved into the account-refresh
job. **Prompt 04 consumes `useSync().state`** — `activeLabelKey`, `completedCount`, `totalCount`,
`status` — and **prompt 05 attaches to `syncQueue.subscribeToFailures`**. Adds
`@react-native-community/netinfo`, so a dev client rebuild is required.

- [x] **04 — Sync progress indicator** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/04-sync-progress-indicator.md`

`SyncProgressBar` reads `useSync().state` and renders only while the queue is `running`. Two of the
prompt's premises were wrong and are recorded in [00-DIVERGENCES.md](00-DIVERGENCES.md): **the
content inset needed no fixing** (the navigator already reduces the screen area by the whole tab bar
column, mini player included), and **the tablet branch is a left rail**, so the bar goes full-width
beneath the navigator rather than inside the rail. The track/fill pair is now the shared
`ProgressTrack` primitive, also used by the mini player and the full-player scrubber. **Prompt 05
attaches to `syncQueue.subscribeToFailures`** — nothing about failures surfaces in this bar. Also
fixes mobile i18next interpolation, which was rendering every `{placeholder}` verbatim.

- [x] **05 — Sync event log** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/05-sync-event-log.md`

`sync_event_log` (migration 7) holds 500 entries; `syncEventLogSink` attaches to
`syncQueue.subscribeToFailures` and changes nothing about how the queue treats a failure.
**Successes are not stored** — a single library pass settles dozens of jobs, so recording them would
turn a diagnostic log into a transcript and squeeze out the entries worth keeping. Offline failures
land as `skipped` rather than `failure`, since the queue parks and retries and the user did nothing
wrong. `classifySyncError` now keeps the API body code alongside the status
(`http_403:membership_required`), because `http_403` alone leaves support asking which 403 it was.
More ▸ Sync log lists newest first with share and clear.

- [x] **06 — Offline content sync**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/06-offline-content-sync.md
Recent window for server feeds, entire feed for add-by-RSS, background sync on foreground/refresh/reconnect.
This is the largest producer of sync work — enqueue on the serial queue from prompt 03 with labels,
never run a pass inline.
Do not run tests; end with operator verification commands.
```

- [x] **07 — Channel seen state**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/07-channel-seen-state.md
One last_seen_at per channel per user. Cap counts at 20 and bound the endpoint result set.
Follow the existing Account.notifications_last_seen_at precedent rather than inventing a model.
Design the endpoints for both mobile and web callers — prompt 13 makes web a client.
Do not run tests; end with operator verification commands.
```

- [x] **08 — Home subscribed list and filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/08-home-list-and-filter.md
Home is subscribed-only. The "Filter..." input filters local content by title only, raw and
article-stripped, across directory subscriptions and add-by-RSS. Always visible for now.
Put new strings in the consumer i18n catalog — web reuses them in prompt 14.
Do not run tests; end with operator verification commands.
```

- [x] **09 — Home filter/sort screen**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/09-home-filter-sort-screen.md
Full-screen Filter/Sort screen with Done. Sorts are A-Z and recent only.
Match the previous generation's layout, never its colors.
This screen is the first consumer of the sort-preference contract, so build it here: a shared
scope key builder in @podverse/helpers (web imports it in prompt 16) plus an AsyncStorage-backed
sortPrefs module in apps/mobile/src/prefs. Restore before the first data read. Device-local only.
Do not run tests; end with operator verification commands.
```

- [x] **10 — Home row metadata**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/10-home-row-metadata.md
Latest episode date, unseen badge with 20+ cap, downloaded count, live badge — all from local storage.
If live status is unavailable from the API, stop and raise it rather than approximating.
Do not run tests; end with operator verification commands.
```

- [x] **11 — Home view toggle and overflow menu**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/11-home-view-toggle-and-overflow.md
Overflow menu with Grid View / List View (persisted, defaults to list) and Mark All As Seen.
Do not run tests; end with operator verification commands.
```

- [x] **12 — Search tab web alignment**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/12-search-tab-web-alignment.md
Remove the medium and sort chip rows so mobile search matches apps/web /search.
Do not run tests; end with operator verification commands.
```

- [x] **13 — Web unseen episode indicator**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/13-web-unseen-episode-indicator.md
This is a web prompt. Web both writes the channel last_seen_at on channel view and displays capped
unseen counts on /podcasts for the subscribed list type. The write half is not optional — without
it, a user who listens on the website keeps a stale badge on their phone.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [x] **14 — Web subscribed filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/14-web-subscribed-filter-input.md
This is a web prompt. Add the same "Filter..." input to /podcasts for the subscribed list type.
Web paginates server-side, so the filter must apply across the whole subscribed list, never one
page — resolve that explicitly and say which approach you chose and why.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [x] **15 — Mobile per-instance sort preferences**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/15-mobile-per-instance-sort-prefs.md
Extend the sort-preference contract from prompt 09 to podcast, episode, and album detail screens,
which hardcode sort today and have no control at all. Scope keys are per instance, so two podcasts
hold two different sorts. Device-local only — no column, no endpoint. Free text still never persists.
Do not run tests; end with operator verification commands.
```

- [x] **16 — Web filter and sort persistence**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/16-web-filter-sort-persistence.md
This is a web prompt. Per-instance sort memory in the local-settings cookie using the shared key
builder from prompt 09, bounded to the 30 most recently used entries with LRU eviction. Cookie, not
localStorage, because web fetches with a sort parameter during SSR. Explicit URL params win and
overwrite the stored value. Also fix the / page Zod defaults that make the stored home sort
unreachable on SSR.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [x] **17 — Notifications read/unread rename**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/17-notifications-read-unread-rename.md
This is a breaking cross-surface rename: ORM column, endpoints, DTO field, request helpers, web
hooks and components, i18n keys, and a browser event. Needs a linear migration and a transition
that does not break an older mobile build. Retention already exists — verify and make it
env-configurable rather than building it.
Do not run tests; end with operator verification commands.
```

- [x] **18 — Record deferrals and close the set** — done, plan archived to
      `.llm/plans/completed/mobile-p2-home-podcasts/18-record-deferrals.md`

All four deferrals (710, 711, 896, 897) were checked against the code and still describe it. Every
detail doc for prompts 01–17 now reads `**Status:** done`, and the P2.1, P2.4, P2.5, and appendix
tables in the Phase 2 master plan agree with them; `implemented` and `complete` were normalized away,
and the deferral docs moved from `draft` to `deferred`. The P2.1.1 and P2.1.3 areas are complete
because their implementation steps are done. Verifying 896 turned up that `tablet.yaml` asserts a
mini player the tablet branch never mounts, which is recorded there rather than fixed.

---

## Combined Podcasts Home follow-up

- [x] **19 — Reconcile merged Home proposals** — done

Updated the durable Home and seen-state proposals so directory subscriptions and add-by-RSS feeds
are one Home collection, with the Home source filter removed and add-by-RSS detail kept in the Home
stack.

- [x] **20 — Complete subscription hydration** — done

Removed the arbitrary directory page ceiling, validated pagination progress, and made complete
directory cache replacement transactional.

- [x] **21 — Simplify Podcasts Home** — done

Home now consumes the complete merged list, ignores legacy Home source-filter preferences, protects
against stale media-switch requests, reports Mark All As Seen failures, and exposes media selector
selection state.

- [x] **22 — Home-stack add-by-RSS detail** — done

Added typed Home navigation, local feed/episode detail, feed-scoped sorting, local seen state,
item playback, and removal notification while preserving the RSS management route.

- [x] **23 — Verify the combined Home contract** — done

Added focused pagination and local-detail unit coverage plus Maestro assertions for unified Home
rows, Home-stack routing, and removal. Device visual review remains recommended and does not gate
completion.

## What is left

All twenty-three prompts are implemented. The plan set is complete. Two optional follow-up actions
remain:

1. **Run the cumulative verification commands** provided in the implementation response. Nothing in
   this set was tested during implementation, by design.
2. **Review the Home (podcasts) and Search screens on a device** if visual feedback is useful. This
   review does not change the implementation or plan completion status.

Because implementation is complete, retire this directory. The durable record is already in the
Phase 2 detail docs and the master plan, so nothing is lost:

```bash
git mv .llm/plans/active/mobile-p2-home-podcasts .llm/plans/completed/
```

`00-SUMMARY.md` is linked from the Phase 2 master plan, so update that link in the same commit.
