# Request: remote item stubs

## Request

Investigate how Podverse handles when a feed has remote items and the remote items are not parsed and saved yet. In general, we want these to still display in lists, but we don't necessarily want to parse and save them to the database yet. We would rather a user manually add that feed to our database. I think this is a gap in our mobile and web experience so far. We may need special handling because some remote items will not contain any information about the remote item except for the feed ID or the feed URL. There may be extra parameters possible, but we don't necessarily want to use them because we may need more information. For example, so we want this type of content to be able to appear in our system. And if a user were to click one of these reference remote items that are not in our system yet, we would want them to be automatically navigated to the podcast, the corresponding podcast index page for that feed ID or feed URL, et cetera, by a lookup in the podcast index. We are trying to conserve database storage unless a user actually wants it added to our database. So, we want it to be a more manual opt-in process.

I am wondering if we should have a special table that is dedicated to just the minimal information needed for remote items, or if we should just flag something in our normal tables. Perhaps we have a special parse operation for reference items that only parses and saves the bare minimum needed for those reference items to display in a list. As a row with the content you would expect from a normal item that is fully parsed. And we just need to flag those rows in our database so we know that those are basically placeholders and not yet fully parsed. And those placeholders, when you click them, should navigate the user to the add podcast index search page.

Also, if a user navigates to a feed on the website that has remote items and those remote items are not parsed yet and there is not even this minimal placeholder row, then we simply don't want those remote items to display on the website or mobile app because we don't want them returned by the API. Because presumably that means that the remote item is not found in Podcast Index, and therefore we do not want to display it on our website. We never want these remote items to result in parsing feeds that are not found in Podcast Index because Podcast Index handles maintaining and filtering spam and malicious content. So Remote items that are saved to the database need to be saved in this special format.

I think Add by RSS can have a similar experience where only the feed that they parse parses and saves fully, but then if the user clicks a remote item, minimal placeholder. So that has to be parsed at least partially for this to happen. Then it should open a screen that is different but similar to the podcast index search page. And in fact, maybe we want this search detail page to be a generic component that podcast index is just a provider for, and add by RSS is a separate path to using that component. And both have minimal amounts of information that they will display.

If a remote item was attempted to be found in podcast index previously, but it was not found, then the next time we try to parse the original feed that contains remote items. It should try again to see if that feed has been added to Podcast Index since then.

Also, a reminder that while Podcast Index is our only service provider for search now, make sure we are writing these things in a way where other index service providers can be swapped in in the future.

We should not use the shrinking service for these remote items that are not yet fully parsed as feeds in our database and saved yet. Also, these remote items that are not fully parsed yet should not show up in our usual endpoints. That already today display information correctly. For example, if I browse channels, I shouldn't see while browsing channels feeds that are just these stubs from remote items. Perhaps stub is a good word for these, or maybe remote stub. To be specific about these rows' purposes.

We need it to work consistently on web and mobile. And think about any management admin tasks related to this process that we may want manual ability to handle. If that's not necessary, then you don't need to. Also, note the current branch we are on because when we create our work tree, we are going to create the worktree off of this branch.

## Operator answers

### Storage model (flag on channel/item rows vs. dedicated stub tables)

Let the planner recommend after researching, and flag it for operator review.

### Existing full-parse path (`config.parser.addRemoteItemsToMQ`)

Keep that flag in case people don't want stubs, but they do want to just automatically parse, to follow and recursively follow and parse all of the remote items they find. Stubs are the default path; the existing full-parse path stays as an opt-in for deployments that want automatic recursive full parses.

### Item-level stubs

Yes. We do want item stubs if that is possible. So maybe both channels and items need stubs. Live items could potentially have stubs too, although we won't be showing up-to-date live status for those. If you click an item stub and the item doesn't exist in our database, the user should be directed to the search detail page for adding the channel, not a search detail page for the item itself, because our process is to go through feeds and channels. And then, if those are added, then items for it can show up. We do want the stub to be able to show that item, however, in our UI for the item. So basically, we end up going down a parser path that selectively only saves stub rows for the channel and potentially items. Note that if you ever save an item stub, there should always be a channel stub with it because we'll need information for both, potentially.

Also, bear in mind that the podcast index has a merged process. So, if we save a stub, we may need to handle a redirect in the future if the reference item pointed to one ID in the podcast index, but then later the ID for that changed to something else.

### Remote-item sources in scope

- Channel `podcast:remoteItem` lists, publisher/artist albums, and podroll get stubs and stub rows in the UI (they already render feed lists today).
- Value time splits: save channel and item stubs for them at parse time, but add no new UI in this set.

### Add by RSS remote-item click

Look the remote item up in the index provider first. If found, create or reuse a normal stub and open the provider search-detail page. If not found, open an Add by RSS search-detail page for the remote feed URL with minimal info and an Add by RSS action. Provider search detail and Add by RSS search detail share one generic component; Podcast Index is one provider for that component, Add by RSS is a separate path.

### Management admin tooling

Include it in this set. List stubs, re-check against the provider now, promote a stub to a full parse, delete, and process handling when remote items change the ID they correspond with in Podcast Index (merge/ID-change). Unsure where in the process the merge handling should happen — planner should place it.

### Worktree base branch

Create the worktree off of `feature/mobile-app-init-36` (the branch this request was made from), not `develop`.

### Review of the first planning pass

- **D1.** Dedicated stub tables. "I want you to do stub tables." Episode and track pages stay on `item`. Podroll and Remote Items each return the whole reference list in one response.
- **D9.** A remote item with a feed URL and no feed GUID stays out of this set. "Yes — keep today’s rule."
- **D18.** Hide a reference with no stub until its source feed is parsed again. No backfill command. "Hide it until reparse, and we don't need a backfill command because we intend to wipe the alpha database before this next deploy, anyway." "Drop it. A wiped database and the next parse are enough."
- **D24.** Add by RSS shows podroll, including episode rows, and the channel remote item list, matching a directory feed. Value time splits stay without a new screen.
- **D29.** A tap on a password-protected Add by RSS feed still goes through Podcast Index. "I think we want to go through the normal podcast index process, but we want to be absolutely sure in our ad by RSS with password process that we never, ever accidentally send that username and password to a different domain than the one feed URL that we have it set for with the ad by RSS. So remote items should not inherit that username and password."
- **D43.** Merges and id changes stay on the server: the next parse, the hourly merge worker, and an admin re-point.
- **D2–D8, D10–D17, D19–D23, D25–D28, D30–D42, D44–D51.** Accepted as written, except D51's backfill command, which D18 drops.

## Glossary

- **stub / remote stub:** a minimal placeholder row for a remote item's feed (and item) that has not been fully parsed. Only created when the index provider knows the feed.
- **shrinking service:** the `imageShrink` worker (`apps/workers/src/commands/imageShrink/`). Stubs must not queue it.
- **Podcast Index search page / search detail page:** `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx` and its mobile counterpart.
- **merged process:** Podcast Index dead-feed merges, where one feed ID is merged into another.
- **index provider:** Podcast Index today. The design must allow other providers to be swapped in.

## Orientation

Facts checked before planning. Planners should start from these.

- `packages/parser/src/lib/rss/remoteItemParser.ts` resolves remote feed GUIDs through `podcastGetByGuid` and queues full parses. It is called from `packages/parser/src/lib/rss/parser.ts` (~line 542) when `config.parser.addRemoteItemsToMQ` is on.
- Reference rows hold `feed_guid`, `feed_url`, `item_guid`, `title`, and `medium_id`:
  - `packages/orm/src/entities/channel/channelRemoteItem.ts`
  - the matching podroll, publisher, and `itemValueTimeSplitRemoteItem` entities
  - `packages/orm/src/services/base/baseRemoteItemsService.ts`
- `apps/api/src/lib/remoteItems.ts` (`buildRemoteItemsFinalResult`) does live Podcast Index batch-by-GUID lookups (with optional by-feed-URL enrichment), caches them in Valkey as `pi:feed:<guid>` and `pi:episode:<item>:<feed>`, and returns `channelsAdded`, `channelsUnadded`, `itemsAdded`, and `itemsUnadded`. Stubs would replace this per-request lookup.
- `packages/helpers/src/lib/podcastIndexFeedReference.ts` defines `unparsedPodcastIndexFeedTarget`. Web unadded rows use it to link to `/podcast-index/feed/<id>`: `apps/web/src/components/List/Music/Albums/ListAlbumRowRemoteItemUnadded.tsx` and `ListAlbumGridNodeUnadded.tsx`.
- Podroll on web: `apps/web/src/app/podcast/[channel_id]/page.tsx` and `apps/web/src/components/Content/Podroll/*`. On mobile: `apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx` and `podcastSections.ts`.
- Mobile artist albums: `apps/mobile/src/screens/artist/ArtistDetailScreen.tsx`.
- Add by RSS remote refs: `apps/api/src/controllers/account/accountAddByRSSParse.ts`, `apps/mobile/src/lib/addByRss/publisherRefs.ts`, `apps/web/src/utils/addByRSS/publisherLinks.ts`.
- Merge handling: `apps/workers/src/commands/podcastIndex/deadFeeds/flagAndMerge.ts`, `apps/api/src/controllers/helpers/mergedInto.ts`, `apps/mobile/src/lib/mergeRedirect.ts`.
