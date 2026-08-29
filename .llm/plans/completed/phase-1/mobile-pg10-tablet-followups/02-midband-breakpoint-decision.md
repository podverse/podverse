# 02 — Mid-band (600–899dp) breakpoint decision + coverage note

**Cursor model:** Auto (docs/decision; no product code unless a nightly device is chosen)
**Ship bar:** The intended layout behavior for the 600–899dp band is documented; the coverage gap is
recorded; any mid-band device is scoped as an **optional nightly**, never a PR gate.

## Why

Two thresholds drive tablet layout:

- `resolveIsTablet(width)` → `true` at **`md` = 600dp** (drives 2-col grids, mini-player width cap,
  and podcast split *when also landscape or ≥ lg*).
- `MOBILE_TABLET_NAV_MIN_WIDTH = breakpoints.lg = 900dp` (drives the left nav rail) and the split's
  `width >= lg` branch.

So **600–899dp** is a real in-between state: 2-column grid + capped mini-player + `isTablet=true`,
but still a **bottom** tab bar and **no split** unless landscape. Pure logic is unit-covered
(`resolveColumns.test.ts` asserts `md`, `md-1`, `lg-1`, `lg`), but **no rendered device** sits in
this band — E2E covers ~390 (phone), ~800→1280 (Pixel tablet, rotates to landscape), ~1032 (iPad
portrait). Large phones in landscape and small 7–8" tablets land here untested.

## Decision to record (pick one, document the rationale)

- **(A) Intended as-is (recommended default).** The layering is deliberate: grids get denser at
  `md`, but the rail/split are reserved for `lg`. No new device; document it and move on.
- **(B) Collapse to one threshold.** If the mid-band is undesirable, align `resolveIsTablet` and the
  rail/split on a single breakpoint. **This is a behavior change** — out of scope for a hardening
  set; if chosen, spin a separate plan (and it would touch the shipped tablet slice).

Default to **(A)** unless product review says otherwise.

## Context (read first)

- `packages/design-tokens/src/tokens.ts` (`breakpoints` sm/md/lg = 0/600/900).
- `apps/mobile/src/theme/resolveColumns.ts`, `useResponsive.ts`; `resolveColumns.test.ts`.
- `apps/mobile/src/navigation/index.tsx` (`MOBILE_TABLET_NAV_MIN_WIDTH`).
- `apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx` (`showSplitLayout` gate).
- Device matrix docs: `docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md` and
  `docs/proposals/mobile/_master-plan_/phase-1/details/510-device-matrix-doc.md`.

## Tasks (for decision A)

1. **Document the band** in `DOCS-MOBILE-DEVICE-MATRIX.md`: a short table/paragraph stating what
   renders at `< md` (phone: 1-col, bottom bar), `md–lg` (600–899: 2-col grid, bottom bar, split
   only in landscape), and `≥ lg` (900+: up to 3-col, left rail, split). State that the band is
   intentional and covered at the logic level only.
2. **Note the E2E gap** in `apps/mobile/e2e/README.md` (or HOW-TO-RUN.md): the rendered device
   matrix intentionally skips the 600–899dp band on PR runs.
3. **Optional nightly (do not implement here):** if a rendered mid-band check is wanted, record it as
   a follow-on against master-plan **18.16** (CI tablet-emulator nightly, still `_TBD_`) — e.g. a
   ~7–8" AVD (~600–800dp portrait) as a nightly-only slot. Keep it out of `mobile:e2e:test -- tablet`
   and off the PR gate.

## Acceptance

- Device-matrix doc states the three-band behavior and marks the mid-band as intentional.
- E2E readme notes the rendered-coverage gap.
- No product code change (decision A). If review picks B, stop and open a separate behavior-change
  plan instead.
