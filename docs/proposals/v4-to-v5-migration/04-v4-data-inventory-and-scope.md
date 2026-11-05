# 04 — v4 Data Inventory and Scope

## Goal

Decide, at table level, what moves from the v4 database into v5, what is mapped
only for redirects, and what is left behind.

## Status

Draft. Needs operator review. Labels: **migrate**, **map**, **drop**, **re-derive**.

## What we know

v4 entities live in `podverse-api@develop` under `src/entities/`. Most catalog
rows use a varchar(14) shortid primary key. User playback rows often use UUIDs.
Podcasts may also carry `podcastIndexId`.

v5 does **not** store a v4 shortid on `channel`. The stable crosswalk for PI
feeds is `feed.podcast_index_id`. See [05](05-id-mapping-and-catalog-seeding.md).

## Proposed scope

| v4 surface | Action | Notes |
| ---------- | ------ | ----- |
| `users` (email, password, name, flags) | **migrate** | Create v5 `account` + `account_credentials`. Preserve bcrypt hash. |
| `users.membershipExpiration` / trial | **migrate** | Via `legacy_import` grants after account exists |
| `users.subscribedPodcastIds` | **migrate** | Resolve each id through the legacy map |
| `users.subscribedPlaylistIds` | **migrate** | Public/followed playlists; private ownership via playlist table |
| `users.subscribedUserIds` | **migrate** or **drop** | Confirm v5 still has follow-user semantics |
| `users.addByRSSPodcastFeedUrls` | **migrate** | URLs; membership rules may differ in v5 |
| `playlist` | **migrate** | Owner + items; remap episode/mediaRef ids |
| `mediaRef` (clips) | **migrate** | Best-effort; orphan if episode cannot be matched |
| `userQueueItem` / `userHistoryItem` / `userNowPlayingItem` | **migrate** | Remap targets; drop rows that cannot resolve |
| `notification` (podcast notify) | **migrate** | Remap podcast → channel |
| `fcmDevice` / `upDevice` | **map** then **re-register** | Prefer fresh tokens after v5 install |
| `paypalOrder` / `appStorePurchase` / `googlePlayPurchase` / `bitPayInvoice` | **map** / later | Expiry via CSV path first; full ledger import is a separate design |
| `accountClaimToken` | **migrate** or **drop** | Unclaimed codes only if v5 still supports them |
| `podcast` / `episode` / `feedUrl` / authors / categories | **re-derive** | Do not copy catalog wholesale; parse into v5 |
| `liveItem` | **re-derive** | From feeds |
| `statsPodcast` / `statsEpisode` / `statsMediaRef` | **map** / seed | Use for popularity seeding; not user-owned |
| Legacy JSON `queueItems` / `historyItems` on user | **drop** if unused | Prefer relational tables if both exist |

### Explicitly out of scope for the first migration wave

- Full Matomo history (use already-aggregated `stats_*`).
- Reconstructing deleted feeds.
- Perfect download-file continuity on every device (best-effort in [08](08-mobile-first-launch-migration.md)).
- F-Droid-specific data paths ([14](14-fdroid.md)).

## Honest limits and risks

- Catalog copy would fight v5's feed parser and Podcast Index sync. Prefer
  seeding feeds that users actually need, then parsing.
- Clips and history tied to vanished episodes will fail the remap. Count them
  in rehearsal; do not promise 100% retention.
- Billing purchase rows are more sensitive than expiry dates. The parked
  membership plan only covers expiry CSV import after accounts exist.
- The export SQL in
  [BILLING-OPERATIONS.md](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  currently names v5-shaped tables. Real v4 uses `users.email` and
  `users.membershipExpiration`. Flagged again in
  [06](06-database-migration-rehearsal.md).

## Open questions

- Keep user-follow (`subscribedUserIds`) in v5?
- Import unclaimed `accountClaimToken` rows?
- How much purchase-ledger fidelity is required vs expiry-only for launch?
- Any tables above that production still writes that we missed?

## Future plan sets

- Per-entity mapping specs (column-level) once [06](06-database-migration-rehearsal.md)
  reports sizes.
- Billing: fix the v4 export SQL; then run the parked membership import plan.
