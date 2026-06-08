# 03 — List embed loading and default selection

## Objective

Implement list embed mode that combines an inline player panel with grouped playable rows, including
deterministic default load behavior, public-only visibility enforcement, and hidden advanced override support.

## Prerequisites

- Phase 1 complete (layout, embed-mode, query parser, visibility gate).
- Phase 2 complete (inline player region pattern).
- Read list contracts and visibility policy in [`00-SUMMARY.md`](./00-SUMMARY.md).

## Scope

- List embed layout:
  - fixed height ~`640px`
  - top inline player panel (same embed-mode contract as Phase 2)
  - bottom/internal list region with scrolling
- Supported list sources (public-only):
  - podcast channel lists
  - album channel lists
  - public playlist lists
- Media handling:
  - audio fully supported
  - video entries show placeholder behavior in player panel

## File targets

- `/apps/web/src/app/embed/podcast/[channel_id]/page.tsx`
- `/apps/web/src/app/embed/album/[channel_id]/page.tsx`
- `/apps/web/src/app/embed/playlist/[playlist_id]/page.tsx`
- `/apps/web/src/components/embed/*` (list panel/list row/group components)
- `/apps/web/src/lib/embed/*` (default-selection, list mapping, visibility helpers)
- Request helper usage from:
  - `/packages/helpers-requests/src/api/*`
  - `/packages/helpers-requests/src/api/queryParams.ts`

## Route-by-route list contract

Defaults mirror the corresponding main-app list pages. Invalid query params normalize to defaults.

### Podcast (`/embed/podcast/[channel_id]`)

| Param | Default | Allowed values |
| --- | --- | --- |
| `type` | `episodes` | Same enum as `QUERY_PARAMS_CHANNEL_TYPE_VALUES` |
| `sort` | `recent` | Same enum as `QUERY_PARAMS_CHANNEL_SORT_VALUES` |
| `page` | `1` | Positive integer |
| `range` | `null` | Same enum as `QUERY_PARAMS_STATS_RANGE_VALUES` or null |
| `autoplay` | `false` | Boolean |
| `t` | `0` | Non-negative integer |
| `play_id_text` | — | Optional item `id_text` override |

- Default selected row: first row for current `sort` (with `recent`, most recent by `pub_date`).
- `play_id_text` matches item `id_text` in the loaded list page; falls back to default row when invalid.

### Album (`/embed/album/[channel_id]`)

| Param | Default | Allowed values |
| --- | --- | --- |
| `sort` | `recent` | Same enum as album channel sort values |
| `page` | `1` | Positive integer |
| `autoplay` | `false` | Boolean |
| `t` | `0` | Non-negative integer |
| `play_id_text` | — | Optional track `id_text` override |

- Default selected row: first track for current sort (with `recent`, most recent track).

### Playlist (`/embed/playlist/[playlist_id]`)

| Param | Default | Allowed values |
| --- | --- | --- |
| `sort` | route default | Same enum as playlist list sort values |
| `page` | `1` | Positive integer |
| `autoplay` | `false` | Boolean |
| `t` | `0` | Non-negative integer |
| `play_id_text` | — | Optional playlist resource `id_text` override |

- **Visibility:** only public playlists embed; private/unlisted → not-available shell (no list data).
- Default selected row: first resource for current sort.

## Visibility enforcement (public-only)

- Podcast/album channels: use the same public visibility checks as main channel pages.
- Playlists: reject non-public `sharable_status` with stable not-available shell.
- Do not leak titles, row counts, or resource IDs for non-public entities.

## Loading rules

- Default behavior: auto-load the default row per route contract above.
- Hidden advanced behavior:
  - if `play_id_text` is present and resolves in the current list page, load that row by default,
  - if invalid/not found/not on current page, fall back to default row (no error throw).
- Row click updates inline player panel; respects embed-mode playback guardrails from Phase 1.

## E2E seed ordering requirement

For deterministic default-row assertions in Phase 5, seed data must use staggered `pub_date` offsets
(mirror music track seed pattern) for podcast channel items used in embed list tests. Document expected
default `id_text` per route in Phase 5 fixture table.

## Test-target contract

Extend embed shell selectors from Phase 2:

| Element | `data-testid` |
| --- | --- |
| List container | `embed-list-region` |
| List row | `embed-list-row` |
| Active/selected row | `embed-list-row-active` |
| Not-available shell | `embed-not-available` |

## Implementation notes

- Reuse existing list endpoint semantics instead of creating embed-specific API variants.
- Keep item grouping logic deterministic and stable for pagination.
- Keep all visible text single-line with truncation.
- Keep per-row interactions aligned with existing list-play patterns under embed-mode constraints.
- When default-selected row is video, player panel shows video placeholder (not full playback).

## Acceptance criteria

- `podcast`, `album`, and `playlist` embed routes load list data for public entities only.
- Non-public playlist/channel renders `embed-not-available` shell with no data leak.
- Default row selection follows route contract tables above.
- `play_id_text` override works when valid and falls back gracefully when invalid.
- Player panel updates correctly when list row changes (inline region, embed-mode safe).
- Fixed-height + internal scrolling behavior is stable (`embed-list-region` scrollable when rows overflow).
- Video default row or video row selection shows placeholder in player panel.
