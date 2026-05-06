# image-candidate-helpers-shared

**Started:** 2026-05-06

**Author:** Cursor Agent

**Context:** Promote pure image-candidate and media-player artwork helpers from apps/web to `@podverse/helpers` for reuse by a future React Native app.

---

### Session 1 - 2026-05-06

#### Prompt (Developer)

Image Candidate Helpers — Promote to @podverse/helpers

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `packages/helpers/src/lib/image-candidates/` with `dedupedTrimmedUrlCandidates`, `resolveImageCandidates`, `itemHeaderSquareArtworkCandidates`, `addByRSSResourceMergedArtworkCandidates`, parameterized `addByRSSFeedListArtworkCandidates` (object arg + default `comparison: 'lesser'`), and `mediaPlayerArtwork` (three exports).
- Barrel `image-candidates/index.ts` and `export * from './lib/image-candidates/index.js'` in `packages/helpers/src/index.ts`.
- Web shims: thin re-exports from `@podverse/helpers`; `addByRSSFeedListArtworkCandidates` web wrapper supplies `IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET`.
- `Image.tsx` imports `resolveImageCandidates` from `@podverse/helpers` for internal use only (no re-export).
- Tests: `imageCandidates.test.ts` + `mediaPlayerArtwork.test.ts` in helpers; slimmed `apps/web/.../imageCandidates.test.ts` to web-only (`listItemImageCandidates`, `addByRSSChannelHeaderTriple`, feed-list wrapper).

#### Files Created/Modified

- `packages/helpers/src/lib/image-candidates/addByRSSFeedListArtworkCandidates.ts`
- `packages/helpers/src/lib/image-candidates/addByRSSResourceMergedArtworkCandidates.ts`
- `packages/helpers/src/lib/image-candidates/dedupedTrimmedUrlCandidates.ts`
- `packages/helpers/src/lib/image-candidates/itemHeaderSquareArtworkCandidates.ts`
- `packages/helpers/src/lib/image-candidates/mediaPlayerArtwork.ts`
- `packages/helpers/src/lib/image-candidates/resolveImageCandidates.ts`
- `packages/helpers/src/lib/image-candidates/index.ts`
- `packages/helpers/src/lib/image-candidates/imageCandidates.test.ts`
- `packages/helpers/src/lib/image-candidates/mediaPlayerArtwork.test.ts`
- `packages/helpers/src/index.ts`
- `apps/web/src/utils/mediaPlayer/mediaPlayerArtwork.ts`
- `apps/web/src/utils/image/dedupedTrimmedUrlCandidates.ts`
- `apps/web/src/utils/image/itemHeaderArtworkCandidates.ts`
- `apps/web/src/utils/image/addByRSSResourceArtworkCandidates.ts`
- `apps/web/src/utils/image/addByRSSFeedListArtworkCandidates.ts`
- `apps/web/src/utils/image/imageCandidates.test.ts`
- `apps/web/src/components/Image/Image.tsx`

---

### Session 2 - 2026-05-06

#### Prompt (Developer)

@podverse/apps/web/src/components/Image/Image.tsx:14 what is going on here? scan the staged and unstaged changes for examples like this. we do NOT want to export something that can simply be imported in other files from helpers

#### Key Decisions

- Removed `export { resolveImageCandidates }` from `Image.tsx`; UI components should not barrel-re-export `@podverse/helpers` symbols.
- `ImagesPerView.tsx` now imports `resolveImageCandidates` directly from `@podverse/helpers`.
- Other one-line shims under `apps/web/src/utils/image/` and `mediaPlayerArtwork.ts` remain intentional compatibility layers for deep imports from the image-promotion plan; they only re-export helpers (no React coupling).
- `apps/web/src/utils/addByRSS/itemIndex.ts` already had a similar `export { ... } from '@podverse/helpers'` pattern for medium helpers — unchanged.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/components/Image/ImagesPerView.tsx`
