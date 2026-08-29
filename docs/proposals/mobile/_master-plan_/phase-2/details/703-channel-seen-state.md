# 703-channel-seen-state

**Master step:** P2.4.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Introduce per-channel **seen** state so subscribed lists can show how much new content a channel has,
without the unbounded storage the legacy app used.

This is **cross-surface**: mobile and web both read it, and both write it.

### Vocabulary

Two indicators exist and they use **different verbs**:

| Concept                 | Verb pair     | Example copy           | Tier                               |
| ----------------------- | ------------- | ---------------------- | ---------------------------------- |
| New content per channel | seen / unseen | "3 unseen episodes"    | Anonymous locally; Account to sync |
| Notification inbox      | read / unread | "unread notifications" | Membership                         |

Notifications move from seen/unseen to read/unread in
[704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md),
which frees "seen" for channel content.

### Model

Store **one `last_seen_at` timestamp per channel per user**, not per-item seen flags. A channel's
unseen count is the number of items with `pub_date > last_seen_at`. Marking a channel seen sets the
timestamp to now.

This is O(1) per subscription rather than O(items), syncs as a single value per channel, and makes
unseen counts independent of notification rows entirely.

**Precedent to follow:** nextgen already does exactly this one level up —
`Account.notifications_last_read_at` is a single account-level timestamp, and `is_unread` /
`unread_count` are derived by comparing `created_at` against it (see
`apps/api/src/lib/accountNotificationApiSerialization.ts`). Reuse that shape rather than inventing a
new one.

Seen state is **user-specific**: an account-scoped table server-side, and the same timestamps stored
locally so anonymous users get working counts. Syncing it is **account** tier.

### API

**Both the count and the result set are bounded.** A channel's count stops at **20** and clients
render `20+`. The endpoint must also cap how many rows it returns, so a user with a very large
subscription list can never trigger an unbounded database or API result. Pagination or an explicit
ceiling is required — an uncapped query fails review.

As built, under `/account/channel-seen`:

| Route                            | Method | Purpose                                                        |
| -------------------------------- | ------ | -------------------------------------------------------------- |
| `/account/channel-seen`          | GET    | Paged directory-channel state with bounded unseen counts        |
| `/account/channel-seen/add-by-rss` | GET  | Paged add-by-RSS state — timestamps only                        |
| `/account/channel-seen/mark`     | POST   | Mark named channels seen                                        |
| `/account/channel-seen/mark-add-by-rss` | POST | Mark named add-by-RSS feeds seen                          |
| `/account/channel-seen/mark-all` | POST   | Sweep every follow of both kinds                                |

Add-by-RSS is split out and carries **no count** because the server stores no add-by-RSS items and
so cannot derive one. The device holding the parsed feed counts its own. Both kinds still sync their
timestamp, so opening a feed on one device clears its badge on another.

The counted query is a `CROSS JOIN LATERAL` limited to the cap plus one, which is what distinguishes
exactly-20 from more-than-20 without counting the rest. It reads a composite
`item (channel_id, pub_date DESC)` index added alongside the columns.

`last_seen_at` lives on the follow rows rather than in a table of its own, because an account and a
channel it follows is exactly the grain the state has. Unfollowing drops it through the existing
cascade.

### Which surfaces read and write

| Surface | Reads                                | Writes                              |
| ------- | ------------------------------------ | ----------------------------------- |
| Mobile  | Unseen counts on the subscribed list | Opening a channel; Mark All As Seen |
| Web     | Unseen counts on `/podcasts`         | Opening a channel page              |

Web **must** write it. Every device is a client of the same state — if web read without writing,
opening a podcast on the website would leave a stale badge on the phone forever. Web display is
detailed in
[712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md).

### Conflict resolution

Seen state only moves **forward**. When a device's local timestamp disagrees with the server, the
**later** one wins. Anonymous local timestamps merge into the account on sign-in by the same rule.

## Acceptance criteria

- Each subscribed channel has a `last_seen_at` timestamp, stored locally on mobile and server-side
  for signed-in users.
- Unseen counts derive from item publish dates; no per-item seen rows exist.
- Counts cap at 20 and render `20+`; the endpoint returns a bounded result set with no unbounded
  query path.
- Opening a channel on **either** mobile or web clears that channel's unseen count everywhere.
- "Mark All As Seen" clears every channel's count.
- A signed-out mobile user gets working unseen counts locally.
- Sign-in merges local timestamps using the later value per channel, idempotently.
- Neither server nor device ever moves a timestamp backward.
- New user-facing strings live in the **`consumer`** i18n catalog so web reuses them.
- Unit tests cover count derivation, the 20 cap, merge-by-later, and monotonicity; integration tests
  cover the endpoint bound.

## Still to come

The state, the endpoints, and the mobile store are in place, and opening a podcast on mobile marks
it seen. Three pieces land elsewhere:

- **Badges on the subscribed list.** `channelSeenRepository.listUnseen` returns counts today; nothing
  renders them yet. Mobile display is part of the subscribed-list work; web display is
  [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md).
- **Mark All As Seen.** The `mark-all` endpoint exists; the overflow-menu action and its local sweep
  arrive with the subscribed-list overflow menu.
- **Opening an add-by-RSS feed.** There is no per-feed detail screen on mobile yet, so there is no
  open event to mark against. Those feeds currently clear via the account sweep or another device.

A mobile channel's count is derived from the episodes stored locally, which is a bounded window
rather than the whole feed, so it can under-report a show that published more than the window holds.
That is deliberate: the badge describes what the user can actually open offline.

## Web parity references

- Precedent: `packages/orm/src/entities/account/account.ts` (`notifications_last_read_at`),
  `apps/api/src/lib/accountNotificationApiSerialization.ts` (`countUnread`, `is_unread`)
- `apps/api/src/routes/account.ts`, `apps/api/src/controllers/account/accountNotification.ts`
- `apps/web/src/app/podcasts/` — where web displays the counts
- Legacy model deliberately **not** reproduced: `podverse-rn` `services/newEpisodesCount.ts`
  (`NEW_EPISODES_COUNT_DATA_2`, per-episode flags)

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/podcasts-unseen-badges.spec.ts
npm run mobile:e2e:test -- home
```
