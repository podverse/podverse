# Feature: add-by-rss-feeds (Part 5)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 61,
> create `add-by-rss-feeds-part-06.md`.

## Metadata

- Started: 2026-02-03
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

High-level planning and subplan breakdown for the Add by RSS feature implementation.

## Sessions

### Session 51 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan
file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed
all the to-dos.

#### Key Decisions

- Allowed parser contexts without Firebase/notifications for Add by RSS parsing.
- Always initialize parser context for parser-category worker commands.

#### Files Modified

- apps/workers/src/index.ts
- packages/parser/src/context.ts
- packages/parser/src/factory.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 52 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed
all the to-dos.

#### Key Decisions

- Added bulk delete helper for IndexedDB Add by RSS feeds.
- Prune local feeds not present in server list before rendering.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/utils/addByRSS/storage.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 53 - 2026-02-03

#### Prompt (Developer)

Instead of setting a max width on the RSS feed URL text input, add the side content empty
component to the add by RSS views similar to how other pages have empty side content. to add
padding on the side

#### Key Decisions

- Removed the add-feed form max width in favor of empty side content padding.
- Added empty `SideContent` to Add by RSS list and detail views.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/styles/app/add-by-rss/AddByRSSList.module.scss
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 54 - 2026-02-02

#### Prompt (Developer)

review your plans, and if you believe they look good, then go ahead and start implementing
the plans

#### Key Decisions

- Added add-by-RSS podcast list components with list/grid rendering using non-add-by-RSS styles.
- Added singular add-by-RSS detail routes and updated list links to use them.
- Added list/grid selector support for add-by-RSS list views.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/album/[id]/page.tsx
- apps/web/src/app/add-by-rss/artist/[id]/page.tsx
- apps/web/src/app/add-by-rss/episode/[id]/page.tsx
- apps/web/src/app/add-by-rss/livestream/[id]/page.tsx
- apps/web/src/app/add-by-rss/podcast/[id]/page.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastGridNode.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastNodes.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastRow.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastsClient.tsx
- apps/web/src/app/add-by-rss/podcasts/page.tsx
- apps/web/src/app/add-by-rss/track/[id]/page.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 55 - 2026-02-02

#### Prompt (Developer)

Proceed with completing all of the remaining plans for this scope of work. Do not ask for
permission to continue. Just go ahead and Complete all of the remaining plans in one session

#### Key Decisions

- Routed add-by-RSS list pages to explicit `/add-by-rss/*` pages using `AddByRSSListClient`.
- Added add-by-RSS list row/grid nodes for artists, albums, episodes, tracks, and livestreams
  using non-add-by-RSS styles.
- Reworked `AddByRSSListClient` to render resource-specific nodes and dropped the generic list
  card layout.
- Fixed podcast last publish date to read from mapped channel about data and removed the
  duplicate podcasts list client.
- Added medium-aware query params to add-by-RSS livestream links when available.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/albums/AddByRSSAlbumGridNode.tsx
- apps/web/src/app/add-by-rss/albums/AddByRSSAlbumNodes.tsx
- apps/web/src/app/add-by-rss/albums/AddByRSSAlbumRow.tsx
- apps/web/src/app/add-by-rss/albums/page.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistGridNode.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistNodes.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistRow.tsx
- apps/web/src/app/add-by-rss/artists/page.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeGridNode.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeNodes.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeRow.tsx
- apps/web/src/app/add-by-rss/episodes/page.tsx
- apps/web/src/app/add-by-rss/livestreams/AddByRSSLivestreamGridNode.tsx
- apps/web/src/app/add-by-rss/livestreams/AddByRSSLivestreamNodes.tsx
- apps/web/src/app/add-by-rss/livestreams/AddByRSSLivestreamRow.tsx
- apps/web/src/app/add-by-rss/livestreams/page.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastGridNode.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastRow.tsx
- apps/web/src/app/add-by-rss/podcasts/page.tsx
- apps/web/src/app/add-by-rss/tracks/AddByRSSTrackGridNode.tsx
- apps/web/src/app/add-by-rss/tracks/AddByRSSTrackNodes.tsx
- apps/web/src/app/add-by-rss/tracks/AddByRSSTrackRow.tsx
- apps/web/src/app/add-by-rss/tracks/page.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastsClient.tsx (deleted)
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 56 - 2026-02-02

#### Prompt (Developer)

the add by rss pages should not use medium as a query param, but instead should have

/add-by-rss/podcast/livestream
/add-by-rss/music/livestream

similar to how non-add-by-rss urls are constructed

#### Key Decisions

- Added add-by-RSS podcast/music livestream list and detail routes to avoid medium query params.
- Updated add-by-RSS livestream links to route through `/add-by-rss/{podcast|music}/livestream`.
- Removed the legacy `/add-by-rss/livestreams` and `/add-by-rss/livestream/:id` pages.

#### Files Modified

- apps/web/src/app/add-by-rss/livestreams/AddByRSSLivestreamGridNode.tsx
- apps/web/src/app/add-by-rss/livestreams/AddByRSSLivestreamRow.tsx
- apps/web/src/app/add-by-rss/livestreams/page.tsx (deleted)
- apps/web/src/app/add-by-rss/livestream/[id]/page.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/livestream/page.tsx
- apps/web/src/app/add-by-rss/podcast/livestream/[id]/page.tsx
- apps/web/src/app/add-by-rss/music/livestream/page.tsx
- apps/web/src/app/add-by-rss/music/livestream/[id]/page.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 57 - 2026-02-02

#### Prompt (Developer)

this is what the add by rss detail view looks like for podcast

but the second one is what it looks like for podcast for non-add by rss

these views should be as identical as possible, just with different data sources, and potentially some different behaviors

you do not need to make the play button work right now, but you should add the more dropdown buttons, but you can make them just call placeholder functions for now that pop an alert for dev purposes

this should follow the same principles of mirroring as the list views. update skills if needed to remember this

#### Key Decisions

- Added an add-by-RSS podcast detail layout mirroring the non-add-by-RSS header and list header.
- Added add-by-RSS podcast episode rows that reuse non-add-by-RSS styles and include MoreButton
  actions wired to alert placeholders.
- Updated the add-by-RSS parity skill to include detail view and MoreButton parity guidance.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastListHeader.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastEpisodeNodes.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastEpisodeRow.tsx
- .cursor/skills/add-by-rss-parity-sync/SKILL.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 58 - 2026-02-02

#### Prompt (Developer)

clips are not possible on the add by rss detail views so that tab should be removed just for the add by rss detail views

the settings view is possible, and it should have the same type of refresh feed button that the non-add-by-rss podcast page has, except it should use the add by rss parser process similar to on the add by rss podcasts view, except it should only send the one feed to the queue for parsing. it should also display status on the settings page so the user knows what the status of their parse request is

#### Key Decisions

- Removed the clips tab in add-by-RSS podcast detail views and added tab state handling.
- Implemented a settings tab with a refresh feed action that queues a single add-by-RSS parse
  and displays parse status.
- Updated the add-by-RSS parity skill to note tab differences and settings behavior.

#### Files Modified

- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastListHeader.tsx
- .cursor/skills/add-by-rss-parity-sync/SKILL.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 59 - 2026-02-02

#### Prompt (Developer)

add some logs into the add-by-rss-on-demand so i can see when a parse operation starts and stops. do not show the feed url. also these logs should only appear when node_env development

#### Key Decisions

- Added development-only start/finish/failed logs for add-by-RSS on-demand parsing without feed URLs.

#### Files Modified

- apps/workers/src/commands/mq/rss/runAddByRSSParser.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 60 - 2026-02-03

#### Prompt (Developer)

build the plan

#### Key Decisions

- Added optional loading message support to the loading spinner overlay.
- Switched add-by-RSS detail loading state to a centered message and spinner without the header.
- Added `misc.loading_your_content` translation key for the loading message.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx
- apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss
- apps/web/i18n/originals/en-US.json
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

# Feature: add-by-rss-feeds (Part 5)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 61,
> create `add-by-rss-feeds-part-06.md`.

## Metadata

- Started: 2026-02-02
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

High-level planning and subplan breakdown for the Add by RSS feature implementation.

## Sessions

### Session 51 - 2026-02-02

#### Prompt (Developer)

i think textinput has its own error message display handling

#### Key Decisions

- Routed Add by RSS errors through `TextInput` `infoError` instead of a custom paragraph.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md

### Session 52 - 2026-02-02

#### Prompt (Developer)

use it

#### Key Decisions

- Moved the Add Feed action into the `TextInput` button prop to keep alignment on errors.
- Guarded add-feed submission while a request is in flight.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-05.md
