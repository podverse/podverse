# Feature: add-by-rss-cache-helper

## Sessions

### Session 1 - 2026-02-05

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Extracted cache map construction and parse-all flow into shared helpers.
- Switched episodes and artists pages to use `AddByRSSListHeader` for consistent header UI.
- Kept page-specific refresh logic while using shared parse-all callbacks.

#### Files Modified

- apps/web/src/utils/addByRSS/cacheMaps.ts
- apps/web/src/utils/addByRSS/parseAll.ts
- apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx
