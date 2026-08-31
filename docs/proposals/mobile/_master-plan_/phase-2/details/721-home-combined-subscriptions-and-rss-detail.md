# 721-home-combined-subscriptions-and-rss-detail

**Master step:** P2.1.1
**Model (author + implement):** Auto
**Status:** done
**Depends on:** 600 unified subscriptions repository, 601 Home subscribed list, 702 offline content
sync, 703 channel seen state

## Decision context

Home's Podcasts list is one subscribed collection. Directory follows and followed add-by-RSS feeds
are both first-class Home rows, and alphabetical sorting applies after the sources are merged.
Add-by-RSS remains an add/manage workflow in My Library, but following a feed makes it available
from the Home stack.

The Home source chip is not part of this experience. Home keeps its local title filter and its
alphabetical/recent sort, while the subscriptions repository retains source filters for consumers
that need a source-specific management view.

## Complete directory hydration

Signed-in subscription hydration walks every directory page until the API reports the final page.
The client does not impose an arbitrary subscription-count ceiling. Invalid metadata, a page that
does not advance, or an unusable response must fail the walk without replacing the previous cache.
The replacement remains atomic so Home never presents a partial account subscription set as complete.

Add-by-RSS records continue to come from their whole-feed SQLite bundles and are merged with the
hydrated directory cache before Home sorting and title filtering.

## Home-stack add-by-RSS detail

An add-by-RSS Home row opens a typed Home-stack detail identified by its local feed identity, not as
a directory channel id. The detail reads the feed record and persisted `AddByRSSMappedFeed`
locally, so the title, artwork, stored episodes, and playback remain available offline.

The detail mirrors the directory Podcast Detail where local data supports it:

- title and artwork;
- stored episode rows;
- local add-by-RSS playback;
- a feed-scoped episode sort preference;
- local mark-seen behavior using the `add-by-rss` subscription kind;
- local removal/unsubscribe followed by Home refresh.

Directory-only behavior is not fabricated for add-by-RSS. Live-item requests, directory channel
metadata, and server-backed channel pagination are omitted or described as unavailable. Missing,
processing, malformed, or empty mapped bundles render localized states rather than crashing.

## Acceptance criteria

- Home Podcasts shows directory and add-by-RSS subscriptions together for signed-in and signed-out
  users.
- Home has no source-filter row, and its title filter and sort operate on the merged local list.
- Alphabetical ordering is applied to the complete hydrated directory set plus local add-by-RSS feeds.
- A failed or partial directory walk leaves the last complete cache intact.
- An add-by-RSS Home row opens and remains within the Home navigation stack.
- The local add-by-RSS detail can render stored episodes and play them without a network request.
- Opening the detail marks that feed seen locally; removal removes it from Home after notification.
- All states, labels, accessibility names, and test identifiers are localized and accessible.
- Focused unit and Maestro coverage proves merged ordering, complete hydration, Home-stack routing,
  local detail behavior, and the important offline/auth states.

## Non-goals

- Legacy Downloaded, Category, Custom Feeds, or online directory search filters.
- A unified Home list for music, clips, or other media types.
- Server-only live-item or directory metadata parity for add-by-RSS feeds.
- A visual sign-off gate for plan completion; focused device review is recommended follow-up.

## References

- [600-unified-subscriptions-repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)
- [601-home-subscribed-mixed-filter](/docs/proposals/mobile/_master-plan_/phase-1/details/601-home-subscribed-mixed-filter.md)
- [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)
- [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)
- [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)
