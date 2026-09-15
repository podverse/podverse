# 01 — Chrome and primitives

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Scope

Detail: [731](/docs/proposals/mobile/_master-plan_/phase-2/details/731-redundant-screen-titles-sweep.md),
[735](/docs/proposals/mobile/_master-plan_/phase-2/details/735-swipe-action-row.md).

1. Remove redundant in-body titles on Downloads and Add-by-RSS feed list screens.
2. Add `Button` `variant="danger"` using `tokens.button.dangerBg` / `dangerColor` (extend
   `createStyles` with `buttonDanger` if needed).
3. Add `SwipeActionRow` wrapping RNGH `Swipeable`: swipe left → danger Remove; also
   `accessibilityActions` for Remove.

## Files

- `apps/mobile/src/screens/library/LibraryDownloadsScreen.tsx` (title only in this step if list
  rewrite is later — at minimum drop heading)
- `apps/mobile/src/screens/rss/AddByRssFeedListScreen.tsx`
- `apps/mobile/src/components/primitives/Button.tsx`
- `apps/mobile/src/theme/createStyles.ts`
- `apps/mobile/src/components/primitives/SwipeActionRow.tsx` (new)
- `apps/mobile/src/components/primitives/index.ts` (export)

## Do not

- Do not run tests during agent work.
- Do not implement the full Downloads list rewrite here (plan 04).

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
