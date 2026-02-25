---
name: add-by-rss-components-sync
description: Keep Add-by-RSS and non-Add-by-RSS list/media components in sync.
version: 1.0.0
---

# Add-by-RSS Components Sync

## Purpose

Keep Add-by-RSS and non-Add-by-RSS list/media components visually and structurally aligned while
preserving their distinct data sources and behaviors.

## Scope

- `apps/web/src/components/Common/` shared list/media components
- `apps/web/src/components/Core/` non-Add-by-RSS components that use Common
- `apps/web/src/components/AddByRSS/**` Add-by-RSS components
- `apps/web/src/app/add-by-rss/**` page entrypoints that import Add-by-RSS components
- `apps/web/src/app/**` page entrypoints for non-Add-by-RSS components

## Workflow

1. Identify the non-Add-by-RSS component being changed (list row, grid node, header, list header).
2. Locate its Core counterpart in `components/Core/**` and Add-by-RSS counterpart in
   `components/AddByRSS/**`.
3. Check for a shared component in `components/Common/**`.
4. If a shared component exists, update it first and verify both call sites.
5. If no shared component exists and layouts match, extract one into `components/Common/**`.
6. Update both Add-by-RSS and non-Add-by-RSS adapters to use the shared component.
7. When refactoring list patterns, align with the Common/Core/AddByRSS split:
   - `components/Common/List/<Resource>/Common<Resource>List{GridNode|Row|Nodes}.tsx`
   - `components/Core/List/<Resource>/Core<Resource>{GridNode|Row|Nodes|List}.tsx`
   - `components/AddByRSS/**/AddByRSS<Resource>{GridNode|Row|Nodes}.tsx`
   - Keep shared types in `components/Common/List/<Resource>/types.ts`

## Naming Conventions

- Shared components in `components/Common/**` use the `Common*` prefix.
- Non-Add-by-RSS components that use Common live in `components/Core/**` and use `Core*` prefix.
- Add-by-RSS components live in `components/AddByRSS/**` and use `AddByRSS*` prefix.
- Page-only components live in `apps/web/src/app/**` and include `Page` in the name.
  - Rename `*Client`, `*Context`, `*DropdownConfig`, `*Header`, `*List` → `*Page*` and update imports.

## Add-by-RSS Constraints

- Add-by-RSS headers must not include share buttons.
- Add-by-RSS channel views should use the feed URL as a title fallback until parsed fields exist.
- Add-by-RSS list views should support list and grid when their non-Add-by-RSS equivalents do.
- Add-by-RSS list rows should include the same MoreButton menu where applicable.

## Checklist

- List row/grid parity: title, image sizing, last pub date formatting, link behavior.
- Header parity: layout structure and shared styles between tablet and desktop.
- Add-by-RSS behavior preserved: subscribe actions, no share buttons.
- Shared styles reused wherever possible (avoid duplicating SCSS).
- Page-level components use the `Page` naming convention (e.g., `PodcastPageList`).

## Examples

- Changing a podcast list row: update `components/Common/List/Podcast/*` and ensure both
  `components/Core/List/Podcast/*` and `components/AddByRSS/Podcast/*` adapters render the same UI.
- Changing a podcast header layout: update
  `components/Common/Media/Podcast/CommonPodcastHeaderView*` and verify the Add-by-RSS header
  renders without share buttons.
- Renaming page-level components: `TracksClient.tsx`, `TracksContext.tsx`, and
  `TracksDropdownConfig.tsx` become `TracksPageClient.tsx`, `TracksPageContext.tsx`, and
  `TracksPageDropdownConfig.tsx`, with imports updated in `apps/web/src/app/tracks/page.tsx`.
