# Plan 04 - Player And Value Time Split Likes

## Goal

Add like controls to the mini- and full-size media players, including a **parent like** in both, and
an **optional** **split like** in the full-size player when value time split metadata is present and
resolvable in our DB. Keep this phase aligned with the narrow VTS scope (see
[00-master-plan.md](./00-master-plan.md)); the broader VTS/overlay/Boost work remains in
[07-future-vts-boost-and-metadata.md](./07-future-vts-boost-and-metadata.md).

## Target Files

- `apps/web/src/components/MediaPlayer/Desktop/MediaPlayerInfoDesktop.tsx`
- `apps/web/src/components/MediaPlayer/Mobile/MediaPlayerInfoMobile.tsx`
- `apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx`
- `apps/web/src/contexts/MediaPlayer.tsx`
- `apps/web/src/contexts/MediaPlayerCurrentTime.tsx`
- `packages/helpers/src/dtos/item/item.ts`
- `packages/helpers/src/dtos/item/itemValue.ts`
- Supporting player utilities under `apps/web/src/utils/mediaPlayer/`

## Steps

1. Mini-player (bottom bar) like:
   - Desktop: to the right of the now-playing metadata (bottom-left cluster), as requested in product UX.
   - Mobile: visible in the same information cluster as the title/artline (not hidden behind menus).
   - **Targeting rule:** mini-player like targets the **currently playing** primary resource, matching the
     rest of the app: normal `Item`, or add-by-RSS when that is the active `mp*`, and **never**
     livestreams.
2. Full-size (modal) player: **parent like** (always the parent `Item` / add-by-RSS parent identity
   for add-by-RSS now-playing).
3. Value time split **split like** (full-size only):
   - **Only render the split like control** when the active VTS can resolve a **canonical `Item` id**
     for the “subcontent” in our database. If it cannot, **do not show** a split like button at all.
   - The split like button is placed **near the VTS title/metadata block** in the full-size info UI, so
     the affordance is visually “about the VTS” while still performing a standard item like toggle
     for the resolved sub-`Item`.
4. Build `activeVts` selection from:
   - current playback time (`MediaPlayerCurrentTime` / controller time update source of truth)
   - VTS intervals from the DTOs actually delivered to the web (may require an item payload change)
5. **Do not** invent a second identity model (remote-only likes) in this phase; any unresolved split
   remains a Boost/UX topic for the future VTS plan placeholder.

## Acceptance Criteria

- Mini- and full-size player display **parent like** for likeable media, with correct add-by-RSS
  behavior where applicable.
- When an active VTS is present **and** resolvable, full-size player shows a **second** like control
  (split like) in addition to parent like.
- Split like toggles the resolved **sub-`Item` like state**, and updates filled/unfilled using the
  same likes membership + toggle services as the rest of the app.
- When a VTS is present but **cannot** be resolved to a `Item` row, **no split like control** appears.
- No like controls appear for livestream-only contexts.
