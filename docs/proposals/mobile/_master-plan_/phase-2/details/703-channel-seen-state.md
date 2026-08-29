# 703-channel-seen-state

**Master step:** P2.4.4
**Model (author + implement):** Opus 5
**Status:** planned

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
`Account.notifications_last_seen_at` is a single account-level timestamp, and `is_new` /
`unseen_count` are derived by comparing `created_at` against it (see
`apps/api/src/lib/accountNotificationApiSerialization.ts`). Reuse that shape rather than inventing a
new one.

Seen state is **user-specific**: an account-scoped table server-side, and the same timestamps stored
locally so anonymous users get working counts. Syncing it is **account** tier.

### API

New endpoint(s) return per-channel unseen counts for the caller, plus a mark-seen write.

**Both the count and the result set are bounded.** A channel's count stops at **20** and clients
render `20+`. The endpoint must also cap how many rows it returns, so a user with a very large
subscription list can never trigger an unbounded database or API result. Pagination or an explicit
ceiling is required — an uncapped query fails review.

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

## Web parity references

- Precedent: `packages/orm/src/entities/account/account.ts` (`notifications_last_seen_at`),
  `apps/api/src/lib/accountNotificationApiSerialization.ts` (`countUnseen`, `is_new`)
- `apps/api/src/routes/account.ts`, `apps/api/src/controllers/account/accountNotification.ts`
- `apps/web/src/app/podcasts/` — where web displays the counts
- Legacy model deliberately **not** reproduced: `podverse-rn` `services/newEpisodesCount.ts`
  (`NEW_EPISODES_COUNT_DATA_2`, per-episode flags)

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/podcasts.spec.ts
npm run mobile:e2e:test -- home
```
