# 05 — Form and add-to parity

**Cursor model:** Codex 5.3 · **Reasoning:** high

Decisions 4–5 in [00-SUMMARY.md](00-SUMMARY.md) · Details
[775](/docs/proposals/mobile/_master-plan_/phase-2/details/775-playlist-form-parity-and-delete.md)
· [776](/docs/proposals/mobile/_master-plan_/phase-2/details/776-add-to-playlist-sheet-parity.md)

## Playlist form

In `PlaylistFormScreen`:

- Create: `OptionChipGroup` for medium (AV / Music); default AV + Private (match web)
- Edit: medium locked / read-only
- Sharable status via `OptionChipGroup` (replace hand-rolled chips)
- Submit through `playlistRepository`; gate errors via `handleGateError`
- Edit only: Delete control → `ConfirmDialog` (`features.playlist.delete_playlist_confirm`) →
  repository delete → navigate to `LibraryPlaylists` (not detail)

## Add-to sheet

In `useAddToPlaylist`:

- Switch adds to `*AddFirst` for all kinds
- Widen target to item / clip / soundbite / add-by-RSS; wire callers that can supply those kinds
- List private playlists through the repository, filtered to the target's medium; prefer A–Z like web
- Create-playlist shortcut (membership-gated) → `PlaylistCreate` without cross-tab jumps
- Success / error notices unchanged keys; no silent catch

## Out of scope

Liked toggles (777). Changing Browse public sort.

## Verification (operator)

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
