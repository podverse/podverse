# Feature: add-by-rss-feeds (Part 3)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 31,
> create `add-by-rss-feeds-part-04.md`.

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

### Session 21 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Derived parsed-only payload types with `Extract` to satisfy the union type.

#### Files Modified

- apps/api/src/lib/addByRSSParseCache.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 22 - 2026-02-02

#### Prompt (Developer)

Cannot find name 'process'. Do you need to install type definitions for node? Try
`npm i --save-dev @types/node`.ts(2580)

/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/index.ts

#### Key Decisions

- Added explicit Node types to workers tsconfig to resolve `process` typing.

#### Files Modified

- apps/workers/tsconfig.json
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 23 - 2026-02-02

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/18.txt:972-1020 fix errors

#### Key Decisions

- Extended Add by RSS parse status to include completed in workers cache typing.
- Narrowed parsed feed payload type using the parsed-only union member.

#### Files Modified

- apps/workers/src/lib/addByRSSParseCache.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 24 - 2026-02-02

#### Prompt (Developer)

Type '"completed"' is not assignable to type 'AddByRSSParseStatus'.ts(2322)

#### Key Decisions

- Included the completed status in the API Add by RSS cache typing.

#### Files Modified

- apps/api/src/lib/addByRSSParseCache.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 25 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress
as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Stored parsed as the success status instead of completed.
- Updated the web UI plan status list to match parsed.

#### Files Modified

- apps/workers/src/commands/mq/rss/runAddByRSSParser.ts
- apps/api/src/lib/addByRSSParseCache.ts
- apps/workers/src/lib/addByRSSParseCache.ts
- .llm/plans/active/add-by-rss/43-web-ui-check-for-updates.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 26 - 2026-02-02

#### Prompt (Developer)

move the duplicated keyvaldb helpers that you think are appropriate to move to the helpers package

#### Key Decisions

- Moved Add by RSS cache types/helpers into @podverse/helpers with app-level adapters.

#### Files Modified

- packages/helpers/src/lib/addByRSSParseCache.ts
- packages/helpers/src/index.ts
- apps/api/src/lib/addByRSSParseCache.ts
- apps/workers/src/lib/addByRSSParseCache.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 27 - 2026-02-02

#### Prompt (Developer)

update the plan text to fix the incongruency

#### Key Decisions

- Updated plan 32 to reflect parsed status naming.

#### Files Modified

- .llm/plans/completed/add-by-rss/32-api-progress-and-results.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 28 - 2026-02-02

#### Prompt (Developer)

update those plan files accordingly

#### Key Decisions

- Standardized IndexedDB storage and synthetic id/id_text for Add by RSS viewer models.
- Switched detail routing to path params keyed by synthetic id_text.

#### Files Modified

- .llm/plans/active/add-by-rss/40-web-ui-and-client-storage.md
- .llm/plans/active/add-by-rss/42-web-ui-list-views.md
- .llm/plans/active/add-by-rss/44-web-ui-add-feed.md
- .llm/plans/active/add-by-rss/45-web-ui-detail-navigation.md
- .llm/plans/active/add-by-rss/46-web-ui-client-storage.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 29 - 2026-02-02

#### Prompt (Developer)

implement the add-by-rss 40-46 all the way until completion, unless there is something critical
you are unsure of, then you should ask me how to answer those questions

#### Key Decisions

- Implemented IndexedDB storage for Add by RSS feeds with synthetic id/id_text mapping.
- Added web UI routes, list/detail views, and check-for-updates workflow.
- Exposed API endpoint + request helpers to list followed Add by RSS channels.

#### Files Modified

- apps/web/src/constants/routes.ts
- apps/web/src/components/SideBar/SideBar.tsx
- apps/web/i18n/originals/en-US.json
- apps/api/src/routes/account.ts
- packages/helpers-requests/src/api/account/follow/addByRSSChannel.ts
- packages/helpers-requests/src/api/\_request.ts
- apps/web/src/utils/addByRSS/types.ts
- apps/web/src/utils/addByRSS/ids.ts
- apps/web/src/utils/addByRSS/storage.ts
- apps/web/src/utils/addByRSS/api.ts
- apps/web/src/utils/addByRSS/mapping.ts
- apps/web/src/app/add-by-rss/[resource]/page.tsx
- apps/web/src/app/add-by-rss/[resource]/[id_text]/page.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/styles/app/add-by-rss/AddByRSSList.module.scss
- apps/web/src/styles/app/add-by-rss/AddByRSSDetail.module.scss
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 30 - 2026-02-02

#### Prompt (Developer)

the Add by RSS accordion in the SideBar should be collapsed by default.

If the SideBar doesn't already, then the state of collapsed and opened sidebar accordions should be
remembered, similar to filters

#### Key Decisions

- Persisted sidebar accordion open state in localStorage with Add by RSS collapsed by default.

#### Files Modified

- apps/web/src/components/Accordian/Accordian.tsx
- apps/web/src/components/SideBar/SideBar.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 31 - 2026-02-02

#### Prompt (Developer)

@en-US.json (57-67)

these key/values should be nested under a key "add_by_rss"

#### Key Decisions

- Nested Add by RSS i18n keys under features.add_by_rss and updated references.

#### Files Modified

- apps/web/i18n/originals/en-US.json
- apps/web/src/components/SideBar/SideBar.tsx
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 32 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Moved iTunes type/live item status enums and lookup helpers into `@podverse/helpers`.
- Added `DTOItemChapterCreate` with explicit nullable fields for compat output.

#### Files Modified

- packages/helpers/src/lib/channelItunesType.ts
- packages/helpers/src/lib/itemItunesEpisodeType.ts
- packages/helpers/src/lib/liveItemStatus.ts
- packages/helpers/src/index.ts
- packages/helpers/src/dtos/item/itemChapterCreate.ts
- packages/helpers/src/dtos/index.ts
- packages/orm/src/entities/channel/channelItunesType.ts
- packages/orm/src/entities/item/itemItunesEpisodeType.ts
- packages/orm/src/entities/liveItem/liveItemStatus.ts
- packages/parser/src/lib/compat/partytime/channel.ts
- packages/parser/src/lib/compat/partytime/item.ts
- packages/parser/src/lib/compat/partytime/liveItem.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser/src/lib/compat/chapters/chapters.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 33 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Created `@podverse/parser-mapping` for browser-safe compat mapping.
- Introduced local partytime-compatible types and a pure JS MD5 for chapter hashes.
- Switched parser live item DTO typing to derive from mapping return types.

#### Files Modified

- package.json
- packages/parser/tsconfig.json
- packages/parser/package.json
- packages/parser/src/lib/chapters/chapters.ts
- packages/parser/src/lib/rss/channel/channel.ts
- packages/parser/src/lib/rss/channel/channelAbout.ts
- packages/parser/src/lib/rss/channel/channelCategory.ts
- packages/parser/src/lib/rss/channel/channelChat.ts
- packages/parser/src/lib/rss/channel/channelDescription.ts
- packages/parser/src/lib/rss/channel/channelFunding.ts
- packages/parser/src/lib/rss/channel/channelImage.ts
- packages/parser/src/lib/rss/channel/channelLicense.ts
- packages/parser/src/lib/rss/channel/channelLocation.ts
- packages/parser/src/lib/rss/channel/channelPerson.ts
- packages/parser/src/lib/rss/channel/channelPodroll.ts
- packages/parser/src/lib/rss/channel/channelPublisher.ts
- packages/parser/src/lib/rss/channel/channelRemoteItem.ts
- packages/parser/src/lib/rss/channel/channelSeason.ts
- packages/parser/src/lib/rss/channel/channelSocialInteract.ts
- packages/parser/src/lib/rss/channel/channelTrailer.ts
- packages/parser/src/lib/rss/channel/channelTxt.ts
- packages/parser/src/lib/rss/channel/channelValue.ts
- packages/parser/src/lib/rss/item/item.ts
- packages/parser/src/lib/rss/item/itemAbout.ts
- packages/parser/src/lib/rss/item/itemChaptersFeed.ts
- packages/parser/src/lib/rss/item/itemChat.ts
- packages/parser/src/lib/rss/item/itemDescription.ts
- packages/parser/src/lib/rss/item/itemEnclosure.ts
- packages/parser/src/lib/rss/item/itemImage.ts
- packages/parser/src/lib/rss/item/itemLicense.ts
- packages/parser/src/lib/rss/item/itemLocation.ts
- packages/parser/src/lib/rss/item/itemPerson.ts
- packages/parser/src/lib/rss/item/itemSeason.ts
- packages/parser/src/lib/rss/item/itemSeasonEpisode.ts
- packages/parser/src/lib/rss/item/itemSocialInteract.ts
- packages/parser/src/lib/rss/item/itemSoundbite.ts
- packages/parser/src/lib/rss/item/itemTranscript.ts
- packages/parser/src/lib/rss/item/itemTxt.ts
- packages/parser/src/lib/rss/item/itemValue.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser-mapping/package.json
- packages/parser-mapping/tsconfig.json
- packages/parser-mapping/src/index.ts
- packages/parser-mapping/src/types/partytime.ts
- packages/parser-mapping/src/compat/partytime/channel.ts
- packages/parser-mapping/src/compat/partytime/compatFull.ts
- packages/parser-mapping/src/compat/partytime/item.ts
- packages/parser-mapping/src/compat/partytime/liveItem.ts
- packages/parser-mapping/src/compat/partytime/publisher.ts
- packages/parser-mapping/src/compat/partytime/value.ts
- packages/parser-mapping/src/compat/chapters/hash.ts
- packages/parser-mapping/src/compat/chapters/chapters.ts
- packages/parser/src/lib/compat/partytime/channel.ts (deleted)
- packages/parser/src/lib/compat/partytime/compatFull.ts (deleted)
- packages/parser/src/lib/compat/partytime/item.ts (deleted)
- packages/parser/src/lib/compat/partytime/liveItem.ts (deleted)
- packages/parser/src/lib/compat/partytime/publisher.ts (deleted)
- packages/parser/src/lib/compat/partytime/value.ts (deleted)
- packages/parser/src/lib/compat/chapters/chapters.ts (deleted)
- packages/parser/src/lib/rss/hash/parsedItemChapter.ts (deleted)
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 34 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added TODO flags where parser-mapping types were relaxed for compatibility.

#### Files Modified

- packages/parser-mapping/src/types/partytime.ts
- packages/parser-mapping/src/compat/partytime/channel.ts
- packages/parser-mapping/src/compat/partytime/item.ts
- packages/parser-mapping/src/compat/chapters/hash.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 35 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added shared status-code extraction for parser error logging.
- Exported explicit live item DTO type from parser-mapping.
- Created a dedicated parser-mapping TODO plan file.

#### Files Modified

- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/lib/rss/feed/feed.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser-mapping/src/compat/partytime/liveItem.ts
- packages/parser-mapping/dist/index.d.ts
- packages/parser-mapping/dist/compat/partytime/liveItem.d.ts
- .cursor/plans/parser-mapping-todos_9c6d43a9.plan.md
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 36 - 2026-02-02

#### Prompt (Developer)

getStatusCodeFromError is this code duplicated? also, if it is generic and can be used elsewhere, move it to an appropriate helpers module

#### Key Decisions

- Centralized status code extraction in helpers-requests.
- Enabled composite builds for helpers-requests to support parser reference.

#### Files Modified

- packages/helpers-requests/src/getStatusCodeFromError.ts
- packages/helpers-requests/src/index.ts
- packages/helpers-requests/tsconfig.json
- packages/parser/src/lib/rss/feed/feed.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/tsconfig.json
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md

### Session 37 - 2026-02-02

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Tightened parser-mapping partytime types to match podverse-partytime phase types.
- Kept parser item helpers typed to Episode and cast live items at the call site.

#### Files Modified

- packages/parser/src/lib/rss/addByRSS.ts
- packages/parser/src/lib/rss/item/item.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser-mapping/src/types/partytime.ts
- packages/parser-mapping/src/compat/partytime/item.ts
- packages/parser-mapping/dist/types/partytime.d.ts
- packages/parser-mapping/dist/compat/partytime/item.d.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-03.md
