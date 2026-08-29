# 707-home-row-metadata

**Master step:** P2.1.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Bring the subscribed podcast row up to previous-generation information density. Four additions:

| Element                      | Source                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **Latest episode: `<date>`** | Channel's latest item publish date, from local storage                           |
| **Unseen count badge**       | Derived from the channel last-seen timestamp (detail 703); capped, renders `20+` |
| **`N downloaded`**           | Count of downloaded episodes for that channel, from the local index              |
| **Live badge**               | Channel's live-item status                                                       |

All four read **local storage**, so a fully offline row still renders correctly. Where the underlying
field is not yet stored locally, extend the local schema and sync
(see [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md))
rather than fetching per row.

Row layout mirrors the previous-generation arrangement — artwork, the latest-episode line, title,
download count, and the count badge trailing. Colors and the badge treatment come from theme tokens,
not from the legacy palette.

**Live badge dependency:** if the live-item status is not currently exposed by the API or stored
locally, that gap is part of this step. If it turns out the API cannot supply it, stop and raise it
with the operator rather than inventing a client-side approximation.

### Live badge — how the gap was closed

Nothing already on the device could answer it. Live items are excluded from every regular item
query, so the stored items for a channel never contain one, and the channel record carries no live
field. The API can supply it, but only per account: `/live-item/subscribed/recent` answers for the
whole follow list in one request, while `/live-item/channel/:id` would mean a request per row.

The resolution is a local `channel_live_status` table filled from two places:

- **Directory channels** — a queued `channel-live-status` sync job calls the subscribed live-item
  endpoint and replaces every directory row wholesale, which is both what ends a broadcast and what
  makes the job idempotent. Signed-in only, because the endpoint answers for an account.
- **Add-by-RSS feeds** — the parsed bundle already on disk declares its own live items, so the
  status is recorded when the feed is parsed. This half works signed out and offline.

A stored status is trusted for one hour. A broadcast ends whether or not the device is online to
hear about it, so without that bound a phone left in a pocket over a weekend would open on Monday
still insisting three shows are live.

## Acceptance criteria

- Each subscribed row shows the latest-episode date, title, downloaded count, and — when non-zero —
  the unseen count badge.
- The unseen badge renders `20+` at the cap and is absent at zero.
- The downloaded count reflects the local download index and updates when a download completes or is
  deleted.
- A live channel shows the live badge.
- Every element renders correctly with the network disabled.
- Date formatting follows the app's locale-aware helper, not an ad-hoc format.
- No hardcoded hex; badge and live colors come from `@podverse/design-tokens`.
- Row content is built from shared components rather than raw `View`/`Text` per
  **mobile-reusable-components**.
- E2E asserts the row elements on a subscription the flow creates.

**Zero is an absence, not a number.** The downloaded count and the unseen badge are both hidden at
zero, so a line appears only when there is something to open offline or something new to hear. A row
the user has caught up on carries no mark.

**A count of zero downloads is also the add-by-RSS state**, because those episodes have no download
path yet — recorded as a divergence rather than shown as `0 downloaded`.

- **Screen reader:** the row reads as one grouped item with a composed label covering title, latest
  episode date, unseen count, and live state. The live badge and unseen count carry meaning through
  color and shape, so both have text equivalents.

## Web parity references

- Legacy row: `podverse-rn` `src/components/PodcastTableCell.tsx`
- `apps/mobile/src/screens/home/HomeFeedRow.tsx`, `homeRowMetadata.ts`
- `apps/mobile/src/data/repositories/channelLiveStatus.ts`, `channelLiveStatusRepository.ts`
- `apps/mobile/src/data/repositories/downloadsRepository.ts`
- `packages/helpers/src/lib/channelSeen.ts` (`describeUnseenBadge`, shared with web in detail 713)
- Skills: **mobile-reusable-components**, **mobile-theme-parity**, **time-format-local**

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- subscriptions-anonymous
npm run mobile:e2e:test -- home
```
