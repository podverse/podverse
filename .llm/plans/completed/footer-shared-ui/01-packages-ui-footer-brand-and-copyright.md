# 01 — `@podverse/ui`: FooterBrand + FooterCopyright

## Goal

Add shared footer primitives next to `FooterLayout`, with **no embedded user-facing copy** and
optional `LinkComponent` (default `<a>`), matching [`ActionLink`](../../../../packages/ui/src/components/navigation/ActionLink/ActionLink.tsx).

## FooterBrand

- Location: `packages/ui/src/components/layout/FooterLayout/FooterBrand.tsx` (+ module SCSS).
- **`'use client'`** — uses [`Image`](../../../../packages/ui/src/components/image/Image/Image.tsx).
- Props (adjust names if needed, keep semantics):

  - **Required:** `logoSrc: string`, `alt: string`.
  - **Optional:** `href` (default `'/'`), `width` / `height` (default **144** / **25**), `skipProxy`,
    `className`, `LinkComponent?: ComponentType<FooterBrandLinkProps>`.

- **`FooterBrandLinkProps`:** at least `{ href: string; children: ReactNode; className?: string }`.
- Default link: render `<a href={href} className={...}>{children}</a>`.
- Inner content: `Image` with passed `src` / `alt` / dimensions / `skipProxy`.

## FooterCopyright

- Location: `packages/ui/src/components/layout/FooterLayout/FooterCopyright.tsx` (+ module SCSS).
- Move layout from app SCSS: flex row, rotated icon spacing — keep visual parity.
- Use `FaRegCopyright` from `react-icons` (already a ui dependency).
- Props:

  - **Required:** `href: string`, `label: string` (localized — **no** English default in UI).
  - **Optional:** `className`, `LinkComponent` with same default `<a>` pattern.

## Barrel

- Export components and prop types from [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts)
  near existing `FooterLayout` exports.

## Optional

- Vitest tests with a `LinkComponent` stub (pattern: `IconButton.test.tsx`).

## Done when

- `npm run lint -w @podverse/ui` and `npm run type-check -w @podverse/ui` pass (from repo root per
  AGENTS).
