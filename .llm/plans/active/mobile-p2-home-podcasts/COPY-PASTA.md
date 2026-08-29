# COPY-PASTA — Home (podcasts), Search, foundations, and web counterparts

Paste one prompt per agent session, **top to bottom**. The numbering below is the run order — no
reordering needed. Dependencies and rationale: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
Locked decisions: [00-SUMMARY.md](00-SUMMARY.md).

Agents do **not** run tests during implementation — the operator verifies at the end.

**Why notifications is last:** prompt 14 is a dependency leaf and the only irreversible step in the
set (breaking ORM rename + linear migration). The legacy Notifications screen has not been reviewed
yet, so it sits at the end where a late change of mind is still cheap.

**This set is mobile-focused but not mobile-only.** Prompts 01, 02, 04, 10, 11, 13, and 14 change
`apps/api`, `packages/orm`, `packages/helpers`, `packages/helpers-requests`, `apps/web`, or
`apps/workers`. Verify those with Playwright (`make e2e_test_web_report_spec`), not Maestro.

| #   | Prompt                                | Surfaces            | Cursor model | Reasoning  |
| --- | ------------------------------------- | ------------------- | ------------ | ---------- |
| 01  | Access tiers and shared gating seam    | mobile, web, shared | Opus 5       | high       |
| 02  | Anonymous subscriptions + bulk follow  | mobile, api         | Opus 5       | high       |
| 03  | Offline content sync                   | mobile              | Opus 5       | high       |
| 04  | Channel seen state                     | mobile, api, orm    | Opus 5       | extra high |
| 05  | Home list and filter input             | mobile              | Codex 5.3    | high       |
| 06  | Home filter/sort screen                | mobile              | Codex 5.3    | medium     |
| 07  | Home row metadata                      | mobile              | Codex 5.3    | medium     |
| 08  | Home view toggle and overflow menu     | mobile              | Codex 5.3    | medium     |
| 09  | Search tab web alignment               | mobile              | Codex 5.3    | medium     |
| 10  | Web unseen episode indicator           | web                 | Opus 5       | high       |
| 11  | Web subscribed filter input            | web                 | Codex 5.3    | high       |
| 12  | Mobile per-instance sort prefs         | mobile, shared      | Opus 5       | high       |
| 13  | Web filter/sort persistence            | web, shared         | Opus 5       | high       |
| 14  | Notifications read/unread rename       | all surfaces        | Opus 5       | extra high |
| 15  | Record deferrals and close the set     | docs                | Auto         | low        |

---

- [ ] **01 — Access tiers and shared gating seam**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/01-access-tiers-and-gating.md
Follow the locked decisions in 00-SUMMARY.md and the rule mobile-anonymous-vs-account-features.
The tier seam is shared: it lives in packages/helpers-requests and web's useMembershipGate
refactors onto it, behavior-preserving. Not a mobile-only change.
Do not run tests; end with operator verification commands.
```

- [ ] **02 — Anonymous subscriptions and bulk follow endpoint**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/02-anonymous-subscriptions.md
Local subscriptions become the source of truth. Signed out subscribes locally only; a signed-in
member syncs; a signed-in non-member is blocked with an explanation. Unsubscribe is never gated.
Add a new idempotent bulk follow endpoint for sign-in merge. Web is unchanged by design.
Do not run tests; end with operator verification commands.
```

- [ ] **03 — Offline content sync**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/03-offline-content-sync.md
Recent window for server feeds, entire feed for add-by-RSS, background sync on foreground/refresh/reconnect.
Do not run tests; end with operator verification commands.
```

- [ ] **04 — Channel seen state**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/04-channel-seen-state.md
One last_seen_at per channel per user. Cap counts at 20 and bound the endpoint result set.
Follow the existing Account.notifications_last_seen_at precedent rather than inventing a model.
Design the endpoints for both mobile and web callers — prompt 10 makes web a client.
Do not run tests; end with operator verification commands.
```

- [ ] **05 — Home subscribed list and filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/05-home-list-and-filter.md
Home is subscribed-only. The "Filter..." input filters local content by title only, raw and
article-stripped, across directory subscriptions and add-by-RSS. Always visible for now.
Put new strings in the consumer i18n catalog — web reuses them in prompt 11.
Do not run tests; end with operator verification commands.
```

- [ ] **06 — Home filter/sort screen**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/06-home-filter-sort-screen.md
Full-screen Filter/Sort screen with Done. Sorts are A-Z and recent only.
Match the previous generation's layout, never its colors.
This screen is the first consumer of the sort-preference contract, so build it here: a shared
scope key builder in @podverse/helpers (web imports it in prompt 13) plus an AsyncStorage-backed
sortPrefs module in apps/mobile/src/prefs. Restore before the first data read. Device-local only.
Do not run tests; end with operator verification commands.
```

- [ ] **07 — Home row metadata**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/07-home-row-metadata.md
Latest episode date, unseen badge with 20+ cap, downloaded count, live badge — all from local storage.
If live status is unavailable from the API, stop and raise it rather than approximating.
Do not run tests; end with operator verification commands.
```

- [ ] **08 — Home view toggle and overflow menu**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/08-home-view-toggle-and-overflow.md
Overflow menu with Grid View / List View (persisted, defaults to list) and Mark All As Seen.
Do not run tests; end with operator verification commands.
```

- [ ] **09 — Search tab web alignment**

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/09-search-tab-web-alignment.md
Remove the medium and sort chip rows so mobile search matches apps/web /search.
Do not run tests; end with operator verification commands.
```

- [ ] **10 — Web unseen episode indicator**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/10-web-unseen-episode-indicator.md
This is a web prompt. Web both writes the channel last_seen_at on channel view and displays capped
unseen counts on /podcasts for the subscribed list type. The write half is not optional — without
it, a user who listens on the website keeps a stale badge on their phone.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [ ] **11 — Web subscribed filter input**

**Cursor model:** Codex 5.3 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/11-web-subscribed-filter-input.md
This is a web prompt. Add the same "Filter..." input to /podcasts for the subscribed list type.
Web paginates server-side, so the filter must apply across the whole subscribed list, never one
page — resolve that explicitly and say which approach you chose and why.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [ ] **12 — Mobile per-instance sort preferences**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/12-mobile-per-instance-sort-prefs.md
Extend the sort-preference contract from prompt 06 to podcast, episode, and album detail screens,
which hardcode sort today and have no control at all. Scope keys are per instance, so two podcasts
hold two different sorts. Device-local only — no column, no endpoint. Free text still never persists.
Do not run tests; end with operator verification commands.
```

- [ ] **13 — Web filter and sort persistence**

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/13-web-filter-sort-persistence.md
This is a web prompt. Per-instance sort memory in the local-settings cookie using the shared key
builder from prompt 06, bounded to the 30 most recently used entries with LRU eviction. Cookie, not
localStorage, because web fetches with a sort parameter during SSR. Explicit URL params win and
overwrite the stored value. Also fix the / page Zod defaults that make the stored home sort
unreachable on SSR.
Verify with Playwright, not Maestro. Do not run tests; end with operator verification commands.
```

- [ ] **14 — Notifications read/unread rename**

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/14-notifications-read-unread-rename.md
This is a breaking cross-surface rename: ORM column, endpoints, DTO field, request helpers, web
hooks and components, i18n keys, and a browser event. Needs a linear migration and a transition
that does not break an older mobile build. Retention already exists — verify and make it
env-configurable rather than building it.
Do not run tests; end with operator verification commands.
```

- [ ] **15 — Record deferrals and close the set**

**Cursor model:** Auto · **Reasoning:** low

```text
Read and execute .llm/plans/active/mobile-p2-home-podcasts/15-record-deferrals.md
Documentation only. Reconcile all statuses, then end with the cumulative verification commands
for the entire set in one fenced bash block, covering both web (Playwright) and mobile (Maestro).
```
