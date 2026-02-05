# Feature: add-by-rss-feeds (Part 7)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 81,
> create `add-by-rss-feeds-part-08.md`.

## Metadata

- Started: 2026-02-03
- Completed: 2026-02-05
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Add-by-RSS settings parity with non-add-by-RSS settings sections.

## Sessions

### Session 75 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added a shared RSS Feed settings section component modeled after SettingsAccount.
- Swapped ListChannelSettings and add-by-RSS settings to use the shared section.

#### Files Modified

- apps/web/src/components/Settings/RSSFeedSettingsSection.tsx
- apps/web/src/components/List/ListChannelSettings.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md

### Session 76 - 2026-02-03

#### Prompt (Developer)

The SettingsWrapper should accept a param called removeWrapperMargin and both ListChannelSettings and AddByRSSPodcastDetailClient should use it. when true it should add an additional class that sets margin to 0

#### Key Decisions

- Added removeWrapperMargin support on SettingsWrapper and applied to both settings views.

#### Files Modified

- apps/web/src/components/Settings/SettingsWrapper.tsx
- apps/web/src/styles/components/Settings/SettingsWrapper.module.scss
- apps/web/src/components/List/ListChannelSettings.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md

### Session 77 - 2026-02-03

#### Prompt (Developer)

The PodcastList component has a style rule of margin-top: var(--spacing-2xl);

Instead this should be a DetailListWrapper component that is reused wherever a component has a class that applies the same styles

Also the AddByRSSDetailClient should use this new component

List all of the components that will need this update

#### Key Decisions

- Introduced a DetailListWrapper to replace shared list margin styles across detail views.

#### Files Modified

- apps/web/src/components/List/DetailListWrapper.tsx
- apps/web/src/styles/components/List/DetailListWrapper.module.scss
- apps/web/src/app/podcast/[channel_id]/PodcastList.tsx
- apps/web/src/app/episode/[item_id]/EpisodeList.tsx
- apps/web/src/app/artist/[channel_id]/ArtistList.tsx
- apps/web/src/app/album/[channel_id]/AlbumList.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamList.tsx
- apps/web/src/app/track/[item_id]/TrackList.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md

### Session 78 - 2026-02-03

#### Prompt (Developer)

if the changes you just made result in unused styles, then remove those style rules / class fro the scss

#### Key Decisions

- Removed the unused PodcastList.module.scss after replacing its styles with DetailListWrapper.

#### Files Modified

- apps/web/src/styles/app/podcast/PodcastList.module.scss
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md

### Session 79 - 2026-02-03

#### Prompt (Developer)

update the @podverse/apps/web/src/components/Settings/RSSFeedSettingsSection.tsx to place the description above it by using the built in button description

and also update the button component so it has the ability to display errors below it, then update RSSFeedSettingsSection to use it

#### Key Decisions

- Added error message support to Button and wired RSSFeedSettingsSection to use it.

#### Files Modified

- apps/web/src/components/Button/Button.tsx
- apps/web/src/styles/components/Button/Button.module.scss
- apps/web/src/components/Settings/RSSFeedSettingsSection.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md

### Session 80 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added add-by-RSS subscribe/unsubscribe button with follow/unfollow behavior and login handling.

#### Files Modified

- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-07.md
