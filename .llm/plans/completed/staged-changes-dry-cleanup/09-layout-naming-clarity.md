# 09 — Layout naming clarity (no functional change)

## Goal

Reduce confusion between similarly-named layout primitives that have **different**
responsibilities. Add a usage comment to the notice/alert family so future contributors
know which to pick.

This step changes names and comments only — no behavior changes.

## Why

### `MainInnerWrapper` vs `MainInnerContentWrapper`

Both names suggest "the inner wrapper of the main area," but they do different things:

- [`MainInnerWrapper`](../../../../packages/ui/src/components/layout/MainInnerWrapper/MainInnerWrapper.tsx)
  is a 2-column **sidebar layout** (`flex-direction: row-reverse`, `:first-child`
  occupies a sidebar slot, `:nth-child(2)` is the main content column).
- [`MainInnerContentWrapper`](../../../../packages/ui/src/components/layout/MainInnerContentWrapper/MainInnerContentWrapper.tsx)
  is a **vertical column stack** (`display: flex; flex-direction: column`).

A reviewer (and the audit's first explore agent) initially mistook them for duplicates
because their names are so close.

### Notice / message family

`Banner`, `Callout`, `CallToActionMessage`, `Alert`, and `RestrictedNotice` are all in
the same visual family. Each has a distinct purpose, but the index does not document
when to use which.

## Design

### Rename (preferred)

- `MainInnerWrapper` → `MainSidebarLayout`
  (rename file, SCSS module, type, and barrel export). Rename the `mainInnerWrapper`
  CSS class to `mainSidebarLayout`.
- `MainInnerContentWrapper` → `MainColumnStack`
  (rename file, SCSS module, type, and barrel export). Rename
  `mainInnerContentWrapper` CSS class to `mainColumnStack`.
- Search consumers in `apps/web` and `apps/management-web` and update imports in lock-
  step. Both names are new in this branch, so impact is limited to the staged
  consumers.

### Alternative (if rename is too invasive)

Add a top-of-file JSDoc comment to each of the two components describing their layout
contract and pointing at the other for the alternative. This is strictly less helpful
than a rename but is non-breaking.

### Notice family doc

In [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts), add a short
section comment above the `Banner` / `Callout` / `CallToActionMessage` / `Alert` /
`RestrictedNotice` exports explaining when each is appropriate, e.g.:

```ts
/**
 * Notice / message family. Pick one:
 * - `Banner`: page-top dismissible info bar (membership expiry, system notices).
 * - `Callout`: inline emphasized block inside content (info / warn / success).
 * - `CallToActionMessage`: empty-state with a prominent action button.
 * - `Alert`: inline status message (error / warn / info / success); see also
 *   `FormErrorMessageText` for form-scoped use.
 * - `RestrictedNotice`: gated-content placeholder shown when membership / auth
 *   blocks the underlying view.
 */
```

(Adjust descriptions to match actual props/usage on review.)

## Steps

1. Rename `MainInnerWrapper` → `MainSidebarLayout`:

   - File + SCSS rename.
   - Class name rename in SCSS + TSX.
   - Update the type and barrel export.
   - Search and update all consumers in `apps/web` and `apps/management-web`.

1. Rename `MainInnerContentWrapper` → `MainColumnStack`: same treatment.
1. Add the notice-family section comment to `packages/ui/src/index.ts`.
1. `npm run lint` and `npm run build:packages` from repo root.

## Done when

- Repo grep for `MainInnerWrapper` / `MainInnerContentWrapper` returns matches only in
  `.llm/` history.
- The notice-family comment block is present in `packages/ui/src/index.ts` near the
  five exports.
- All affected apps still build.
- E2E for affected pages passes (see `10-verification.md`).
