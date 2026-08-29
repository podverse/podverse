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

- [ ] **03 — Fast startup and the serial sync queue**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/03-fast-startup-and-sync-queue.md
Nothing network-bound may block first paint — the splash waits for SQLite and i18n only, and the
auth hydrate chain moves into queued jobs. One background job runs at a time; interactive work
(Subscribe, opening a screen, search, playback) is never queued.
Do not run tests; end with operator verification commands.
```

- [ ] **04 — Sync progress indicator**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/04-sync-progress-indicator.md
A bar above the mini player, falling to the tab bar when nothing is playing. Mount it in the tablet
navigator branch too or it silently vanishes there. Fix the missing bottom content inset while you
are in that layout — lists already slide under the mini player today.
Do not run tests; end with operator verification commands.
```

- [ ] **05 — Sync event log**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/05-sync-event-log.md
Capped at 500, reachable from More, exportable. The stored entry must carry the machine-readable
error code — the message is localized, so the code is the only part a user can quote to support.
Do not run tests; end with operator verification commands.
```

- [ ] **06 — Offline content sync**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/06-offline-content-sync.md
Recent window for server feeds, entire feed for add-by-RSS, background sync on foreground/refresh/reconnect.
This is the largest producer of sync work — enqueue on the serial queue from prompt 03 with labels,
never run a pass inline.
Do not run tests; end with operator verification commands.
```

- [ ] **07 — Channel seen state**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/07-channel-seen-state.md
One last_seen_at per channel per user. Cap counts at 20 and bound the endpoint result set.
Follow the existing Account.notifications_last_seen_at precedent rather than inventing a model.
Design the endpoints for both mobile and web callers — prompt 13 makes web a client.
Do not run tests; end with operator verification commands.
```

- [ ] **08 — Home subscribed list and filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/08-home-list-and-filter.md
Home is subscribed-only. The "Filter..." input filters local content by title only, raw and
article-stripped, across directory subscriptions and add-by-RSS. Always visible for now.
Put new strings in the consumer i18n catalog — web reuses them in prompt 14.
Do not run tests; end with operator verification commands.
```

- [ ] **09 — Home filter/sort screen**

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

- [ ] **10 — Home row metadata**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/10-home-row-metadata.md
Latest episode date, unseen badge with 20+ cap, downloaded count, live badge — all from local storage.
If live status is unavailable from the API, stop and raise it rather than approximating.
Do not run tests; end with operator verification commands.
```

- [ ] **11 — Home view toggle and overflow menu**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/11-home-view-toggle-and-overflow.md
Overflow menu with Grid View / List View (persisted, defaults to list) and Mark All As Seen.
Do not run tests; end with operator verification commands.
```

- [ ] **12 — Search tab web alignment**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/12-search-tab-web-alignment.md
Remove the medium and sort chip rows so mobile search matches apps/web /search.
Do not run tests; end with operator verification commands.
```

- [ ] **13 — Web unseen episode indicator**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/13-web-unseen-episode-indicator.md
This is a web prompt. Web both writes the channel last_seen_at on channel view and displays capped
unseen counts on /podcasts for the subscribed list type. The write half is not optional — without
it, a user who listens on the website keeps a stale badge on their phone.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [ ] **14 — Web subscribed filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/14-web-subscribed-filter-input.md
This is a web prompt. Add the same "Filter..." input to /podcasts for the subscribed list type.
Web paginates server-side, so the filter must apply across the whole subscribed list, never one
page — resolve that explicitly and say which approach you chose and why.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [ ] **15 — Mobile per-instance sort preferences**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/15-mobile-per-instance-sort-prefs.md
Extend the sort-preference contract from prompt 09 to podcast, episode, and album detail screens,
which hardcode sort today and have no control at all. Scope keys are per instance, so two podcasts
hold two different sorts. Device-local only — no column, no endpoint. Free text still never persists.
Do not run tests; end with operator verification commands.
```

- [ ] **16 — Web filter and sort persistence**

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

- [ ] **17 — Notifications read/unread rename**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/17-notifications-read-unread-rename.md
This is a breaking cross-surface rename: ORM column, endpoints, DTO field, request helpers, web
hooks and components, i18n keys, and a browser event. Needs a linear migration and a transition
that does not break an older mobile build. Retention already exists — verify and make it
env-configurable rather than building it.
Do not run tests; end with operator verification commands.
```

- [ ] **18 — Record deferrals and close the set**

**Cursor model:** Auto · **Reasoning:** low

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/18-record-deferrals.md
Documentation only. Reconcile all statuses, then end with the cumulative verification commands
for the entire set in one fenced bash block, covering both web (Playwright) and mobile (Maestro).
```
