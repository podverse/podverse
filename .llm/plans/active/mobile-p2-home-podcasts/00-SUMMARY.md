# Phase 2 — Home (podcasts), Search, and foundations

Area: **P2.1.1 Home & browse** (podcasts media type) + **P2.1.3 Search & filter**, plus the new
**Track P2.4** cross-cutting foundations those screens depend on and **Track P2.5** web counterparts.

Detail docs: `docs/proposals/mobile/_master-plan_/phase-2/details/700`–`713`, plus deferred follow-ups
`897`–`899`.
Phase plan: [001-MASTER-PLAN-PHASE-2.md](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).

Source: operator screenshots of the previous-generation Podcasts screen (subscribed list, header
overflow menu, grid view, and the filter/sort screen), reviewed against the current nextgen mobile
code and `apps/web`.

## Locked decisions

Each entry is the question, the decision, and why.

### Navigation and information architecture

1. **Keep the Search tab?** — **Yes.** Reversed an earlier inclination to remove it. Discovery needs
   a home, and folding API search into the list screen conflicts with a local filter.
2. **What is Home?** — **Subscribed-only.** No global or directory rows in any auth state. All
   discovery lives in the Search tab.
3. **Tab layout parity** — **Intentionally different from the previous generation.** Nextgen keeps
   Home, Search, Notifications, My Library, More. The old Podcasts / Episodes / Clips tabs are
   represented by Home's media-type chips. Not a parity gap.

### Home filter input

4. **What is the top input?** — A **`Filter…`** field, not a search field. It filters; it never
   queries the API.
5. **What does it match?** — **Title only**, case-insensitive substring.
6. **Leading articles** — Matches the **raw and article-stripped** title, so `adam` finds
   "The Adam Friedland Show". Consistent with the existing article-stripped sort.
7. **What does it filter over?** — **Locally stored** channels and items, covering **both** directory
   subscriptions and add-by-RSS feeds in one merged result. Works fully offline.
8. **Placement** — **Always visible** at the top of the list, scrolling with content. The legacy
   hidden-until-pull-down reveal is **deferred** (detail 710).
9. **Persistence** — Kept for the **session**; cleared on app restart.
10. **Existing `all | add-by-RSS` chip** — **Kept.** It scopes the list; the filter narrows within it.

### Sort and the filter/sort screen

11. **Sort options** — **A-Z** and **recent** (latest item publish date). The legacy directory sorts
    (top past day/week/month/year/all-time) are not reproduced, because Home is subscribed-only.
12. **Presentation** — **Full-screen** screen with Filter and Sort sections, checkmarks on the active
    options, and a **Done** action. Matches the previous-generation layout.

### Row content

13. **Row metadata** — Reproduce all four: **latest episode date**, **unseen count badge**,
    **`N downloaded`**, and the **live badge**. All read local storage.
14. **Colors** — Layout aligns with the previous generation; the **color scheme does not**. Nextgen
    themes and design tokens only.

### Header overflow menu

15. **Menu contents** — **Grid View / List View** toggle and **Mark All As Seen**, as in the legacy
    app.
16. **View default** — **List**, persisted. Deliberately different from legacy, which defaulted to
    grid.

### Empty states

17. **No subscriptions** — Guidance plus a **Search** button that opens the Search tab.
18. **Filter matches nothing** — A plain "no matches" message, **no** Search button. Different
    problem, different remedy.

### Seen versus read

19. **Naming** — Content is **seen / unseen** ("3 unseen episodes"); notifications are
    **read / unread**. Different verbs so the two indicators are never confused. Notifications ship
    today using seen/unseen, so this is a **breaking rename** across the ORM column, endpoints, DTO
    field, request helpers, web hooks and components, i18n keys, and a browser event name — not a
    copy tweak (detail 704).
20. **Storage model** — **One `last_seen_at` timestamp per channel per user**, not per-item flags.
    The unseen count is items with `pub_date > last_seen_at`. O(1) per subscription instead of
    O(episodes), and it makes the badge independent of notification rows. Nextgen already uses this
    exact shape one level up in `Account.notifications_last_seen_at`, so follow that precedent.
21. **Granularity** — **Channel-level only.** Opening a channel marks that channel seen; Mark All As
    Seen marks every channel. No per-episode mark-as-seen.
22. **Bounding** — Counts cap at **20** and render **`20+`**. The endpoint must also cap the rows it
    returns; no unbounded database or API result is acceptable.
23. **Conflict resolution** — **Later timestamp wins.** Seen state only moves forward. Anonymous
    timestamps merge into the account by the same rule on sign-in.
24. **Notification retention** — **Already exists.** `AccountNotification.expires_at` defaults to one
    month and the `platformPurge` worker deletes expired rows. Scope is to **verify and make the
    window env-configurable**, not to build it. The inbox is a recent activity view.

### Access tiers

25. **Three tiers, not two** — **Anonymous**, **Account**, **Membership**. "Logged-in only" and
    "logged-in with a valid membership" are different requirements.
26. **Gate test** — Does the feature need a **server-side write** or a **job that must run**? If yes
    it is membership-tier unless assigned otherwise.
27. **Assignments** — Local subscribe, local list/filter/sort, downloads, offline playback, local
    queue/history, local seen state, and **unsubscribing** are **anonymous**. Cross-device sync of
    seen state is **account**. Server-side follow, cross-device sync of queue and history,
    add-by-RSS, and notifications are **membership**.
28. **Subscribing has three behaviors.** Signed out: works **locally only**, nothing reaches the
    server. Signed in with a valid membership: works and syncs. Signed in with an invalid or expired
    membership: **blocked**, with a message explaining why. `POST /account/follow/channel` already
    enforces this and the gate stays.
29. **Unsubscribing is never gated** — not by tier, not by an expired membership. `unfollowChannel`
    already skips the membership check; mobile must not add one.
30. **Signed-out subscriptions** — Must work, and this is a **foundational step sequenced first**
    (detail 701). Local records are the source of truth; account hydration becomes a sync input.
    Creating an account syncs local subscriptions up to the server.
31. **Sign-up merge needs a new endpoint** — no bulk follow endpoint exists today, and sequential
    single-follow calls would hit rate limits. A **new idempotent bulk follow endpoint** reporting
    per-channel outcomes is in scope for detail 701. **Revised during prompt 02:** the merge runs at
    **sign-up only**, not on every sign-in, and the account is the source of truth afterwards — see
    the divergences below.
32. **Lapsed membership** — Degraded, never frozen. Existing add-by-RSS feeds stay visible and
    playable but **stop refreshing**; adding new ones is blocked. Reminders appear at the feature, in
    More/settings, and as a dismissible Home banner — all **in-app**, derived on demand. Never push,
    email, or a scheduled job (rule `no-membership-expiry-notifications`).
33. **Auto-renew carve-out** — Enrolled users should not be told they are expiring soon, but payment
    functionality does not exist yet, so that predicate is **deferred** (detail 711).
34. **The tier seam is shared, not mobile-only** — it lives in `packages/helpers-requests`, extending
    the existing `parseMembershipGateError` / `MembershipDenialReason` types. Web's
    `useMembershipGate` refactors onto it, behavior-preserving, instead of keeping a second model.

### Offline

35. **Offline is a headline feature.** Everything subscribed must be browsable and playable offline —
    channels **and** their items, not only downloaded media.
36. **Storage depth** — A **recent window** (latest 50, extended on demand) for server-backed
    channels; the **entire feed, no cap**, for add-by-RSS, because the user chose it explicitly and
    there is no server-side pagination behind it.
37. **Sync** — A background process reconciles local storage with the server and RSS feeds whenever
    the network is available.

### Search tab

38. **Align with web.** Web's `/search` is one debounced field against Podcast Index with no mode
    toggles, no sort, and no pagination. **Remove** mobile's medium and sort chip rows. Results come
    from Podcast Index, so filtering and sorting can only reflect what that API returns — not worth
    maintaining as a divergence.

### Web counterparts

39. **Web writes per-channel seen state.** Opening a channel page on web sets that channel's
    `last_seen_at`. Non-optional: state that syncs across devices must be written by every device
    that can change it, or the phone shows a permanently stale badge (detail 712).
40. **Web displays unseen counts** on `/podcasts` for the subscribed list type, capped at `20+`,
    matching mobile (detail 712).
41. **Web gets the `Filter…` input too** on `/podcasts` (detail 713). Web paginates server-side, so
    the filter must apply across the **whole** subscribed list rather than the current page —
    resolved by either fetching the full list for filtering or passing the term server-side.
42. **New shared strings go in the `consumer` i18n catalog**, not the mobile overlay, so web and
    mobile use identical copy. A key may not exist in both `consumer` and `mobile`.
43. **Intentional divergences, recorded** — mobile subscriptions are local-first while web's stay
    account-backed; mobile Home is subscribed-only while web keeps its type selector and pagination.
    Neither is a parity gap and neither converges.

### Accessibility

44. **Every new control in this set ships screen reader accessible** — accessible name, role, and
    state on both platforms. A `testID` is not a label. Chips, tabs, option rows, the overflow menu,
    and the unseen badge all convey state visually today and must convey it to assistive technology
    too.
45. **The existing surface area is audited separately** (detail 899, P2.3.10). Measured coverage is
    poor: 27 of 75 mobile files and 56 of 674 web files use any accessibility attribute, with the
    media player the worst area on both. That deferral does **not** excuse new work in this set.

### Filter and sort persistence

46. **Every screen with a filter or sort control remembers the last selection** and restores it on
    load, on both web and mobile, with matching behavior. Details 714 and 715; rule
    [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc).
47. **Scoped per instance, not per screen type.** `/podcast/abc` and `/podcast/xyz` hold independent
    sorts. Web's current `fd.<page>` cookie is keyed by page type and cannot express this; that is the
    gap being closed. The scope key builder is shared in `@podverse/helpers` so the two apps cannot
    drift.
48. **Device-local, never server-synced.** No column, endpoint, or account field. A phone and a laptop
    may legitimately disagree.
49. **Web stores in the cookie, bounded to 30 entries with LRU eviction — not `localStorage`.** Web
    fetches with a sort parameter during server rendering and cannot read `localStorage` there, so any
    other store produces a default-sorted first paint that reshuffles after hydration. The 30-entry
    cap keeps the cookie near 1KB, since it rides on every same-origin request. Mobile has no such
    constraint and stores unbounded.
50. **Structured selections only; free text never persists.** Sort, type, range, category, media type,
    tab, and view mode are remembered. The `Filter…` inputs on mobile Home (705) and web `/podcasts`
    (713) keep clearing — a restored text filter hides most of the list and reads as missing data.
    Page number and scroll position are also excluded. **705 and 713 do not change.**
51. **An explicit URL parameter wins and overwrites the stored value** for that instance, so a shared
    link behaves as written and the next clean-URL visit keeps what the user just saw. Defaults are
    never written into the URL — [`routing-url-params`](/.cursor/rules/routing-url-params.mdc) still
    applies.
52. **Mobile detail screens gain sort controls they do not have today.** Podcast, episode, and album
    detail currently hardcode their sort with no UI at all.
53. **Nothing network-bound blocks first paint.** The splash waits for SQLite and i18n only. The auth
    hydrate chain — `/auth/me`, the up-to-25-page subscription loop, playlist hydration, native
    projection — moves off the startup path into queued jobs (detail 717).
54. **Background sync is serial; interactive work is not.** One background job at a time so sync
    cannot saturate the network or the JS thread. Tapping Subscribe, opening a screen, search, and
    playback stay immediate — a user must never wait behind a library sync (detail 717).
55. **Progress counts discrete jobs and the total may grow mid-run.** A subscriptions job discovers
    N channels and enqueues N more jobs. The denominator increasing is honest; a fixed fake
    denominator is not (detail 718).
56. **The indicator sits above the mini player, and above the tab bar when it is hidden.** Both come
    from one insertion point in the phone `tabBar` column, because `MiniPlayer` returns `null` when
    idle. It must also be added to the tablet branch or it vanishes at ≥900dp (detail 718).
57. **Failures are silent on the bar and durable in a log.** A failed job is skipped and the run
    continues; offline is expected behavior and must not produce a red bar. The failure goes to a
    500-entry capped log reachable from More (details 718, 719).
58. **Logged entries must carry the machine-readable error code.** The message is localized, so the
    code is the only part a user can quote to support (detail 719).
59. **The missing bottom content inset is fixed with the indicator, not deferred.** There is no
    `MINI_PLAYER_HEIGHT` or `useBottomTabBarHeight` today, so lists already slide under the mini
    player; adding a bar without a shared bottom-chrome height makes a live bug worse (detail 718).

## Standing policy captured as abcmemory

Several decisions were general enough to become guidance rather than plan text:

- [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc) —
  new rule: signed-out capability, the server-write gate test, the three tiers, tier assignments, and
  lapsed-membership behavior. **Applies retroactively** to outstanding plans.
- **mobile-data-layer** skill — offline listening as a headline feature, subscribed channels and
  their items stored locally, background sync.
- **mobile-theme-parity** skill — align layout with the previous generation, never its colors.
- **mobile-legacy-screenshot-planning** skill — the alignment premise, no question budget, and
  mandatory question triggers for filter/sort mismatches and cross-surface impact.
- [`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc) — new rule: work
  focused on one surface must assess whether web, API, or ORM need matching changes; cross-device
  state must be written by every surface that can change it; check what already exists before
  proposing to build it; record intentional divergences.
- [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc) — new rule: every
  screen and component must be usable with VoiceOver, TalkBack, and desktop screen readers; a
  `testID` is not a label; improve labeling in code you already touch.
- [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) — new rule: filter and sort
  selections are remembered per instance, stored on the device, restored before the first data read;
  URL parameters win and overwrite; free text never persists.
- [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc) — new rule: nothing
  network-bound blocks first paint; background sync is serial and interactive work is not; every
  queued job is visible in the indicator; failures are quiet on screen and logged with their error
  code.

## Deferred out of this set

| Deferral                             | Detail | Why                                             |
| ------------------------------------ | ------ | ----------------------------------------------- |
| Filter hidden-until-pull-down reveal  | 710    | Presentation polish; ship visible first         |
| Auto-renew-aware expiry reminders     | 711    | Needs payment functionality that is absent      |
| Theme grouping by dark/light mode     | 898    | Cross-surface token work, unrelated area        |
| Full screen reader audit of all apps  | 899    | Program-sized; new work stays accessible anyway |
| Mobile SQLite schema/migration drift checks | 897 | Valuable after Phase 2 as the local schema grows |
| Tablet layout parity (left rail, no mini player) | 896 | Converging on a phone UX that is still changing means doing it twice |

## What changes outside `apps/mobile`

This set is mobile-focused but is **not** mobile-only. Per
[`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc):

| Surface                    | Why it changes                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `packages/orm`             | Per-channel seen state; notifications column rename + linear migration                   |
| `apps/api`                 | Seen-state endpoints, bulk follow endpoint, renamed notification endpoints               |
| `packages/helpers`         | **Access-tier resolver**; DTO field rename; seen-count DTOs; **sort-pref scope key builder** shared with web |
| `packages/helpers-requests`| `accessDenialReasonFromGate`, the HTTP-shaped half of the tier seam; renamed notification request helpers |
| `apps/web`                 | Writes seen state, displays unseen counts, gains the filter input, notifications rename, `useMembershipGate` refactor, **per-instance filter/sort persistence** |
| `apps/workers`             | Retention window becomes env-configurable                                                |
| `packages/i18n-catalog`    | New shared keys in `consumer`; renamed notification keys                                 |

**Open assumption flagged for operator review.** If a user signs into an account whose membership is
invalid, the bulk sign-in sync is blocked by the same membership rule as single follow. Local
subscriptions are retained on the device and sync when membership becomes valid, and the user is told
so rather than silently losing the merge. If new accounts always start with a valid trial this path
is rare, but it still needs defined behavior. Correct this if the intent differs.

## Implementation divergences from the locked decisions

Recorded as they happen, in [00-DIVERGENCES.md](00-DIVERGENCES.md).

## Out of scope

Episodes, clips, artists, albums, and tracks media types on Home; podcast and episode detail
screens; category browse; the legacy QR-code scanner.
