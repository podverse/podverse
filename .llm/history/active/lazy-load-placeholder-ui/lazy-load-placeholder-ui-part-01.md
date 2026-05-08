# lazy-load-placeholder-ui

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Move LazyLoadPlaceholder from apps/web into @podverse/ui for reuse; keep i18n in apps via props.

### Session 1 - 2026-05-07

#### Prompt (Developer)

move LazyLoadPlaceholder into podverse/ui

#### Key Decisions

- Implemented `LazyLoadPlaceholder` in `packages/ui` with required `ariaLabel` (no `next-intl` in shared UI per **shared-ui-i18n**).
- Web passes `tMisc('loading')` via small client helper `PlaylistEditListPlaylistResourcesLoading` used as `dynamic()` loading UI.
- Moved SCSS into the package; removed app-local component and styles.

#### Files Created/Modified

- `packages/ui/src/components/layout/LazyLoadPlaceholder/LazyLoadPlaceholder.tsx`
- `packages/ui/src/components/layout/LazyLoadPlaceholder/LazyLoadPlaceholder.module.scss`
- `packages/ui/src/components/layout/LazyLoadPlaceholder/LazyLoadPlaceholder.test.tsx`
- `packages/ui/src/components/layout/LazyLoadPlaceholder/index.ts`
- `packages/ui/src/index.ts`
- `apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageList.tsx`
- Deleted `apps/web/src/components/LazyLoadPlaceholder/LazyLoadPlaceholder.tsx`
- Deleted `apps/web/src/styles/components/LazyLoadPlaceholder/LazyLoadPlaceholder.module.scss`
