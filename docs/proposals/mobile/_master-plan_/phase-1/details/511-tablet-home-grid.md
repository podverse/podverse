# 511-tablet-home-grid

**Master step:** 18.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Introduce a shared responsive breakpoint helper and apply it so Home and browse lists render
multi-column at tablet widths while phone layout is unchanged.

1. **Breakpoints token + hook.** Add `breakpoints` (e.g. `sm: 0`, `md: 600`, `lg: 900`) to
   [`packages/design-tokens/src/tokens.ts`](/packages/design-tokens/src/tokens.ts) and a
   `useResponsive()` hook in `apps/mobile/src/theme/` (built on `useWindowDimensions`) returning
   `{ width, isTablet, columns }`. `isTablet` = width ≥ `md`. No hardcoded pixel literals in
   screens — read from the hook/tokens.
2. **Home grid.** In [`HomeScreen.tsx`](/apps/mobile/src/screens/home/HomeScreen.tsx), drive the
   feed `FlatList` `numColumns` from `useResponsive().columns` (1 on phone, 2+ on tablet). Ensure
   `key`/`columnWrapperStyle` are set correctly when `numColumns` > 1 (FlatList requires a fresh
   `key` when `numColumns` changes).
3. **Browse lists.** Apply the same column count to browse/section lists that use card rows
   (e.g. `LibrarySubscriptionsScreen`, search results grids) where a grid reads well; keep pure
   text rows single-column.

## Acceptance criteria

- Phone (width < 600) renders exactly as today (1 column).
- Tablet width (≥ 600) renders Home feed in 2+ columns without clipped cards or key warnings.
- Column count comes from the `useResponsive` hook; no inline width math in screens.
- Rotating a tablet re-flows columns (hook reacts to `useWindowDimensions`).

## Web parity references

- [`apps/web/src/app/HomePageClient.tsx`](/apps/web/src/app/HomePageClient.tsx),
  [`HomePageList.tsx`](/apps/web/src/app/HomePageList.tsx) — grid density and card hierarchy.
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md`.

## Verification

```bash
npm run mobile:ios -- --device "iPad Pro 13-inch (M4)"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
