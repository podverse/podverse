# 02 — Delete `CommonListPageHeader` pass-through

## Goal

Delete [`apps/web/src/components/Common/List/CommonListPageHeader.tsx`](../../../../apps/web/src/components/Common/List/CommonListPageHeader.tsx)
and replace its 6 import sites with direct `import { MainHeader } from '@podverse/ui'`.

## Why

The component is a no-op forwarder:

```12:17:apps/web/src/components/Common/List/CommonListPageHeader.tsx
export const CommonListPageHeader: React.FC<CommonListPageHeaderProps> = ({
  title,
  buttonsNode,
}) => {
  return <MainHeader title={title} buttonsNode={buttonsNode} />;
};
```

It binds nothing — no i18n, no `next/link`, no app convention. This violates
[`app-local-ui-wrappers.mdc`](../../../../.cursor/rules/app-local-ui-wrappers.mdc):

> Do not use bare `export { X } from '@podverse/ui'` as a substitute — wrappers must
> bind meaningful app conventions.

`apps/web/src/app/clips/ClipsPageHeader.tsx` already imports `MainHeader` directly,
proving the wrapper is not load-bearing and creating import inconsistency.

## Files to update

Replace the `CommonListPageHeader` import + usage with `MainHeader` in:

- [`apps/web/src/app/podcasts/PodcastsPageHeader.tsx`](../../../../apps/web/src/app/podcasts/PodcastsPageHeader.tsx)
- [`apps/web/src/app/albums/AlbumsPageHeader.tsx`](../../../../apps/web/src/app/albums/AlbumsPageHeader.tsx)
- [`apps/web/src/app/HomePageHeader.tsx`](../../../../apps/web/src/app/HomePageHeader.tsx)
- [`apps/web/src/app/episodes/EpisodesPageHeader.tsx`](../../../../apps/web/src/app/episodes/EpisodesPageHeader.tsx)
- [`apps/web/src/app/artists/ArtistsPageHeader.tsx`](../../../../apps/web/src/app/artists/ArtistsPageHeader.tsx)
- [`apps/web/src/app/tracks/TracksPageHeader.tsx`](../../../../apps/web/src/app/tracks/TracksPageHeader.tsx)
- [`apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx`](../../../../apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx)
- [`apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx`](../../../../apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx)

## Files to delete

- `apps/web/src/components/Common/List/CommonListPageHeader.tsx`
- The directory if it becomes empty (it will not — `CommonListPageHeader` is the only
  file there; check siblings before removing the directory).

## Steps

1. For each consumer, replace
   `import { CommonListPageHeader } from '...'` with
   `import { MainHeader } from '@podverse/ui';`, ensuring the new import is grouped
   with other `@podverse/*` imports (workspace group, see import-order rule).
1. Replace each `<CommonListPageHeader title={...} buttonsNode={...} />` JSX call with
   `<MainHeader title={...} buttonsNode={...} />`.
1. Delete `CommonListPageHeader.tsx`.
1. Run `npm run lint -w apps/web` from repo root; fix any import-order changes.

## Done when

- `npm run lint -w apps/web` passes.
- Repo grep for `CommonListPageHeader` returns no app source matches.
- Affected page headers visually unchanged (verify in `10-verification.md`).
