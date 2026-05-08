# History — image-components-ui-promotion

## Metadata

- Started: 2026-05-06
- Author: Cursor agent
- Context: Move Podverse web Image components into `@podverse/ui`.

## Session 1 — 2026-05-06

#### Prompt (Developer)

Move Podverse web Image components into `@podverse/ui`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `next` as peer + dev dependency and `@podverse/helpers` as dependency on `@podverse/ui`; wired proxy/placeholder/grid slot via new `ImageRuntimeProvider` / `useImageRuntime` so shared components do not import web config.
- Moved `Image`, `SkeletonFlashImage`, `ImagesPerView`, `ImageNonReact` and colocated SCSS into `packages/ui/src/components/image/**`; exported from `packages/ui/src/index.ts`.
- Wrapped `apps/web` `Providers.tsx` with `ImageRuntimeProvider` using `config.public.imageProxy.enabled`, `PROXY.PATH`, `IMAGES.SRC.PLACEHOLDER`, `IMAGES.LIST.GRID.SIZE`.
- Migrated all web call sites to `@podverse/ui`; removed `apps/web/src/components/Image/*` and `apps/web/src/styles/components/Image/*`.
- Added Vitest coverage: `Image.test.tsx` (mocked `next/image`), `ImageRuntime.test.tsx`.

#### Files Created/Modified

- `packages/ui/package.json`
- `package-lock.json` (repo root)
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.tsx`
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.test.tsx`
- `packages/ui/src/components/image/Image/Image.tsx`
- `packages/ui/src/components/image/Image/Image.module.scss`
- `packages/ui/src/components/image/Image/Image.test.tsx`
- `packages/ui/src/components/image/ImageNonReact/ImageNonReact.tsx`
- `packages/ui/src/components/image/ImageNonReact/ImageNonReact.module.scss`
- `packages/ui/src/components/image/SkeletonFlashImage/SkeletonFlashImage.tsx`
- `packages/ui/src/components/image/ImagesPerView/ImagesPerView.tsx`
- `packages/ui/src/index.ts`
- `apps/web/src/providers/Providers.tsx`
- ~46 `apps/web/src/**/*.tsx` files (imports updated to `@podverse/ui`)
- Removed: `apps/web/src/components/Image/*.tsx`, `apps/web/src/styles/components/Image/*.scss`
