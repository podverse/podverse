# 896-defer-tablet-layout-parity

**Master step:** P2.3.12
**Model (author + implement):** Opus 5
**Status:** deferred until the phone UX is settled

## The intended rule

Tablet should be the phone UX, responsively stretched to fill the width — the same information
architecture, the same chrome, the same navigation. Not a separate layout.

## What the code does instead

At `width >= breakpoints.lg` (900dp), `apps/mobile/src/navigation/index.tsx:851-880` diverges in two
ways that were not intended:

1. **The tab bar becomes a left rail.** `tabBarPosition: 'left'` with `beside-icon` labels and a
   `minWidth: 120` rail (lines 860-868). The phone has bottom tabs.

2. **The mini player is not mounted at all.** The custom `tabBar` render prop only composes
   `PlaybackE2eStatus` + `MiniPlayer` + `BottomTabBar` in the phone branch; the tablet branch
   returns a bare `<BottomTabBar {...props} />` (lines 871-880). A tablet user has **no mini player
   and no path back to the full player** except the tab bar.

The second is the more serious of the two: it is missing functionality, not a layout preference.

## Why this is deferred and not fixed now

Phase 2 is rebuilding the phone screens from legacy screenshots. Converging tablet onto a phone
layout that is still changing means doing it twice. This is recorded so the divergence is a known
deferral rather than something discovered later and mistaken for a deliberate tablet design.

## When this is picked up

- Remove the `tabBarPosition: 'left'` branch and let the phone chrome stretch.
- Mount the mini player on tablet.
- Audit every other `isTabletLayout` / `MOBILE_TABLET_NAV_MIN_WIDTH` branch for the same class of
  divergence — grid column counts that respond to width are fine; different navigation is not.
- Re-check the tablet Maestro flow (`apps/mobile/e2e/tablet.yaml`).

## Interaction with in-flight work

Anything added to the phone `tabBar` column must also be added to the tablet branch, or it silently
disappears on tablet. The sync indicator
([718](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)) is the
first case of this and calls it out explicitly.

## Confirmed against what shipped

Both divergences are still present: `tabBarPosition: 'left'` at `>= lg`, and a tablet `tabBar` that
returns a bare `<BottomTabBar />` with no mini player.

The sync indicator did reach tablet. `SyncProgressBar` renders twice over: inside the phone `tabBar`
column, and as a full-width strip beneath the whole navigator on tablet, carrying the home-indicator
inset itself. No other phone-only chrome landed without a tablet equivalent — the only things left in
the phone column are the mini player and `PlaybackE2eStatus`, both of which this deferral already
owns.

**The opt-in tablet Maestro flow cannot pass today.** `apps/mobile/e2e/tablet.yaml` plays an episode
and then waits on `playback-active-e2e` and `mini-player`, neither of which is mounted on the tablet
branch. It is excluded from the phone matrix so nothing goes red on a normal run, but anyone invoking
`npm run mobile:e2e:test -- tablet` will see it fail there, and that failure is this deferral rather
than a regression. Mounting the mini player fixes the flow and the missing functionality together.
