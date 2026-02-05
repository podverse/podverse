# Feature: add-by-rss-feeds (Part 10)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 111,
> create `add-by-rss-feeds-part-11.md`.

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

Refresh add-by-RSS subscribe state using auth/me.

## Sessions

### Session 101 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Mirror account follow helper pattern for add-by-RSS follow/unfollow by returning auth/me.

#### Files Modified

- packages/helpers-requests/src/api/account/follow/addByRSSChannel.ts
- apps/web/src/utils/addByRSS/api.ts
- apps/web/src/utils/addByRSS/actions.ts
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md

### Session 102 - 2026-02-03

#### Prompt (Developer)

implement the plan

#### Key Decisions

- Extract shared podcast list and header layouts into Common components.
- Move Add-by-RSS podcast components into components/AddByRSS with Page naming.
- Rename podcast page-level components to include "Page" in app routes.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- apps/web/src/components/Common/List/Podcast/CommonPodcastListRow.tsx
- apps/web/src/components/Common/List/Podcast/CommonPodcastListGridNode.tsx
- apps/web/src/components/Common/List/Podcast/CommonPodcastListNodes.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeader.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeaderViewDesktop.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeaderViewTablet.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastRow.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastGridNode.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastNodes.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcasts.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeader.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderButtons.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderCategories.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderImage.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderSubtitle.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewTablet.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastListNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSEpisodeRow.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSEpisodeNodes.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/my-profile/MyProfileContentList.tsx
- apps/web/src/app/profile/[id_text]/ProfileContentList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodeClient.tsx
- apps/web/src/app/clip/[clip_id]/ClipClient.tsx
- apps/web/src/app/chapter/[item_chapter_id_text]/ChapterClient.tsx
- apps/web/src/app/official-clip/[item_soundbite_id]/OfficialClipClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx
- apps/web/src/components/Common/List/Podcast/PodcastListRow.tsx (deleted)
- apps/web/src/components/Common/List/Podcast/PodcastListGridNode.tsx (deleted)
- apps/web/src/components/Common/List/Podcast/PodcastListNodes.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderLayout.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewDesktopLayout.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewTabletLayout.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastRow.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastGridNode.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastNodes.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcasts.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeader.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderButtons.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderCategories.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderImage.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderSubtitle.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewDesktop.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewTablet.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageHeader.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListNodes.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeRow.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeNodes.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageDetailClient.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx (deleted)

### Session 104 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Rename Common/Core/AddByRSS podcast components to standardized prefixes.
- Move AddByRSS podcast page-only components into app directory.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- apps/web/src/components/Common/List/Podcast/CommonPodcastListRow.tsx
- apps/web/src/components/Common/List/Podcast/CommonPodcastListGridNode.tsx
- apps/web/src/components/Common/List/Podcast/CommonPodcastListNodes.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeader.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeaderViewDesktop.tsx
- apps/web/src/components/Common/Media/Podcast/CommonPodcastHeaderViewTablet.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastRow.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastGridNode.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastNodes.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcasts.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeader.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderButtons.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderCategories.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderImage.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderSubtitle.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewTablet.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastListNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSEpisodeRow.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSEpisodeNodes.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/my-profile/MyProfileContentList.tsx
- apps/web/src/app/profile/[id_text]/ProfileContentList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodeClient.tsx
- apps/web/src/app/clip/[clip_id]/ClipClient.tsx
- apps/web/src/app/chapter/[item_chapter_id_text]/ChapterClient.tsx
- apps/web/src/app/official-clip/[item_soundbite_id]/OfficialClipClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx
- apps/web/src/components/Common/List/Podcast/PodcastListRow.tsx (deleted)
- apps/web/src/components/Common/List/Podcast/PodcastListGridNode.tsx (deleted)
- apps/web/src/components/Common/List/Podcast/PodcastListNodes.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderLayout.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewDesktopLayout.tsx (deleted)
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewTabletLayout.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastRow.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastGridNode.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcastNodes.tsx (deleted)
- apps/web/src/components/Core/List/Podcast/ListPodcasts.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeader.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderButtons.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderCategories.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderImage.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderSubtitle.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewDesktop.tsx (deleted)
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewTablet.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageHeader.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListNodes.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeRow.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeNodes.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageDetailClient.tsx (deleted)
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx (deleted)

### Session 105 - 2026-02-03

#### Prompt (Developer)

the AddByRSSListClient should be in the src/components/AddByRSS/ directory

#### Key Decisions

- Relocate AddByRSSListClient to components/AddByRSS and update page imports.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- apps/web/src/components/AddByRSS/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/[resource]/page.tsx
- apps/web/src/app/add-by-rss/albums/page.tsx
- apps/web/src/app/add-by-rss/artists/page.tsx
- apps/web/src/app/add-by-rss/episodes/page.tsx
- apps/web/src/app/add-by-rss/podcasts/page.tsx
- apps/web/src/app/add-by-rss/tracks/page.tsx
- apps/web/src/app/add-by-rss/podcast/livestream/page.tsx
- apps/web/src/app/add-by-rss/music/livestream/page.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx (deleted)

### Session 106 - 2026-02-03

#### Prompt (Developer)

1/1
Next.js 16.1.6Webpack
Build Error
Module not found: Can't resolve '../../Header/HeaderButtons'
./src/components/Core/Media/Podcast/CorePodcastHeaderButtons.tsx (12:1)

Module not found: Can't resolve '../../Header/HeaderButtons'
10 | import React from 'react'
11 |

> 12 | import HeaderButtons from '../../Header/HeaderButtons'

     | ^

13 |
14 | type CorePodcastHeaderButtonsProps = {
15 | channel: DTOChannel

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
./src/components/Core/Media/Podcast/CorePodcastHeader.tsx

#### Key Decisions

- Fix CorePodcastHeaderButtons import path to components/Media/Header.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderButtons.tsx

### Session 107 - 2026-02-03

#### Prompt (Developer)

Build Error
Module not found: Can't resolve '../../Link/Link'
./src/components/Core/Media/Podcast/CorePodcastHeaderCategories.tsx (6:1)

Module not found: Can't resolve '../../Link/Link'
4 | import type { DTOChannelCategory } from '@podverse/helpers'
5 |

> 6 | import { Link } from '../../Link/Link'

    | ^

7 |
8 | type CorePodcastHeaderCategoriesProps = {
9 | channel_categories?: DTOChannelCategory[]

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/components/Core/Media/Podcast/CorePodcastHeaderSubtitle.tsx
./src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
./src/components/Core/Media/Podcast/CorePodcastHeader.tsx

#### Key Decisions

- Fix CorePodcastHeaderCategories import path to components/Link.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderCategories.tsx

### Session 108 - 2026-02-03

#### Prompt (Developer)

Module not found: Can't resolve '../../Image/Image'
./src/components/Core/Media/Podcast/CorePodcastHeaderImage.tsx (7:1)

Module not found: Can't resolve '../../Image/Image'
5 | import { findDTOChannelImageBySize, findDTOItemImageBySize } from '@podverse/helpers'
6 |

> 7 | import { Image } from '../../Image/Image'

     | ^

8 | import { IMAGES } from '../../../../constants/images'
9 | import styles from '../../../../styles/components/Media/Podcast/PodcastHeaderImage.module.scss'
10 |

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
./src/components/Core/Media/Podcast/CorePodcastHeader.tsx

#### Key Decisions

- Fix CorePodcastHeaderImage import path to components/Image.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderImage.tsx

### Session 109 - 2026-02-03

#### Prompt (Developer)

Module not found: Can't resolve '../../Link/Link'
./src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx (12:1)

Module not found: Can't resolve '../../Link/Link'
10 |
11 | import { CommonPodcastHeaderViewDesktop } from '../../../Common/Media/Podcast/CommonPodcastHeaderViewDesktop'

> 12 | import { Link } from '../../Link/Link'

     | ^

13 | import { ROUTES } from '../../../../constants/routes'
14 | import styles from '../../../../styles/components/Media/Podcast/PodcastHeaderViewDesktop.module.scss'
15 | import { CorePodcastHeaderButtons } from './CorePodcastHeaderButtons'

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./src/components/Core/Media/Podcast/CorePodcastHeader.tsx

try to find similar import issues in related components and fix them

#### Key Decisions

- Fix CorePodcastHeaderViewDesktop/Tablet Link import paths after relocation.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewDesktop.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastHeaderViewTablet.tsx

### Session 110 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Extract dedupe TTL helper into helpers mq lib and reuse it.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
- packages/helpers/src/lib/mq/getDedupeTTLSeconds.ts
- packages/helpers/src/index.ts
- apps/api/src/controllers/account/accountAddByRSSParse.ts
- apps/api/src/controllers/mq/mq.ts
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- apps/web/src/components/Core/List/Podcast/ListPodcastRow.tsx
- apps/web/src/components/Core/List/Podcast/ListPodcastGridNode.tsx
- apps/web/src/components/Core/List/Podcast/ListPodcastNodes.tsx
- apps/web/src/components/Core/List/Podcast/ListPodcasts.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeader.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderButtons.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderCategories.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderImage.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderSubtitle.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewDesktop.tsx
- apps/web/src/components/Core/Media/Podcast/PodcastHeaderViewTablet.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/my-profile/MyProfileContentList.tsx
- apps/web/src/app/profile/[id_text]/ProfileContentList.tsx
- apps/web/src/app/episode/[item_id]/EpisodeClient.tsx
- apps/web/src/app/clip/[clip_id]/ClipClient.tsx
- apps/web/src/app/chapter/[item_chapter_id_text]/ChapterClient.tsx
- apps/web/src/app/official-clip/[item_soundbite_id]/OfficialClipClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx
- apps/web/src/components/List/Podcasts/ListPodcastRow.tsx (deleted)
- apps/web/src/components/List/Podcasts/ListPodcastGridNode.tsx (deleted)
- apps/web/src/components/List/Podcasts/ListPodcastNodes.tsx (deleted)
- apps/web/src/components/List/Podcasts/ListPodcasts.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeader.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderButtons.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderCategories.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderImage.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderSubtitle.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderViewDesktop.tsx (deleted)
- apps/web/src/components/Media/Podcast/PodcastHeaderViewTablet.tsx (deleted)
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- apps/web/src/components/Common/List/Podcast/types.ts
- apps/web/src/components/Common/List/Podcast/PodcastListRow.tsx
- apps/web/src/components/Common/List/Podcast/PodcastListGridNode.tsx
- apps/web/src/components/Common/List/Podcast/PodcastListNodes.tsx
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderLayout.tsx
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewDesktopLayout.tsx
- apps/web/src/components/Common/Media/Podcast/PodcastHeaderViewTabletLayout.tsx
- apps/web/src/components/List/Podcasts/ListPodcastRow.tsx
- apps/web/src/components/List/Podcasts/ListPodcastGridNode.tsx
- apps/web/src/components/List/Podcasts/ListPodcastNodes.tsx
- apps/web/src/components/Media/Podcast/PodcastHeader.tsx
- apps/web/src/components/Media/Podcast/PodcastHeaderViewDesktop.tsx
- apps/web/src/components/Media/Podcast/PodcastHeaderViewTablet.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeRow.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageEpisodeNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/podcasts/PodcastsPageClient.tsx
- apps/web/src/app/podcasts/PodcastsPageHeader.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/podcasts/page.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageSideContent.tsx
- apps/web/src/app/podcast/[channel_id]/page.tsx
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastRow.tsx (deleted)
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastGridNode.tsx (deleted)
- apps/web/src/app/add-by-rss/podcasts/AddByRSSPodcastNodes.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastListHeader.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastEpisodeNodes.tsx (deleted)
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastEpisodeRow.tsx (deleted)
- apps/web/src/app/podcasts/PodcastsClient.tsx (deleted)
- apps/web/src/app/podcasts/PodcastsHeader.tsx (deleted)
- apps/web/src/app/podcasts/PodcastsList.tsx (deleted)
- apps/web/src/app/podcast/[channel_id]/PodcastClient.tsx (deleted)
- apps/web/src/app/podcast/[channel_id]/PodcastList.tsx (deleted)
- apps/web/src/app/podcast/[channel_id]/PodcastListHeader.tsx (deleted)
- apps/web/src/app/podcast/[channel_id]/PodcastSideContent.tsx (deleted)

### Session 103 - 2026-02-03

#### Prompt (Developer)

Within the src/components directory, since we have a Common directory for the shared components, and an AddByRSS directory for the AddByRSS components that use the Common directory, we should have a 3rd directory named Core, and it should have a List and Media directories within it, and the Podcast related components that are not AddByRSS but also use Common should be placed within that Core directory. Only focus on the Podcast related components for now. Also update your skill if it needs to be updated to remember this pattern, as we will be applying it to all similar components. Also mention the "Page" naming convention in a skill if it is not documented already, as we will be applying it to all page-specific implementations of components in the future.

#### Key Decisions

- Move non-AddByRSS podcast list/media components under components/Core.
- Update Add-by-RSS sync skill to include Core/ and Page naming conventions.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-10.md
