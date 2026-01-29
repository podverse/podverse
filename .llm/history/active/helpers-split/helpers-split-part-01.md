# Helpers Split Migration History

Feature: Split QueryParams types from `@podverse/helpers` to `@podverse/helpers-requests`

## Overview

This migration moves all QueryParams types from the core `@podverse/helpers` package to the specialized `@podverse/helpers-requests` package to improve package organization and reduce dependencies.

---

### Session 1 - 2026-01-29

#### Prompt (Agent)

@migration-COPY-PASTA.md (67-77)

#### Key Decisions

- Executed migration part 9: episodes and clips contexts
- Split QueryParams imports in 4 context files
- Pattern: DTOs and utilities stay in `@podverse/helpers`, QueryParams move to `@podverse/helpers-requests`

#### Files Modified

- `apps/web/src/app/podcasts/livestreams/LivestreamsContext.tsx`
- `apps/web/src/app/episodes/EpisodesContext.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodeContext.tsx`
- `apps/web/src/app/clips/ClipsContext.tsx`
- `.llm/plans/active/helpers-split/migration-09-episodes-clips-contexts.md` (marked as completed)

---

### Session 2 - 2026-01-29

#### Prompt (Developer)

@migration-COPY-PASTA.md (55-65)

#### Key Decisions

- Executed migration part 8: podcast pages
- Migrated 5 podcast-related page files
- Moved all QueryParams types to `@podverse/helpers-requests` except `QueryParamsQueueMedium` which stays in `@podverse/helpers`
- Split imports to keep DTOs and utility functions in `@podverse/helpers` while moving QueryParams to `@podverse/helpers-requests`

#### Files Modified

- `apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts` - Moved 4 QueryParams types to helpers-requests
- `apps/web/src/app/podcast/[channel_id]/PodcastClient.tsx` - Split imports: DTOs in helpers, QueryParamsChannel in helpers-requests
- `apps/web/src/app/podcast/[channel_id]/PodcastContext.tsx` - Split imports: DTOs/getTotalPages in helpers, QueryParamsChannel in helpers-requests
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx` - Split imports: DTOs/QueryParamsQueueMedium in helpers, QueryParamsLiveItem in helpers-requests
- `apps/web/src/app/podcasts/PodcastsContext.tsx` - Split imports: DTOs/utilities in helpers, QueryParamsGetMany in helpers-requests
- `.llm/plans/active/helpers-split/migration-08-podcast-pages.md` (marked as completed)
