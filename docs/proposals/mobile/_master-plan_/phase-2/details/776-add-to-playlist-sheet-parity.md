# 776-add-to-playlist-sheet-parity

**Master step:** P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Bring [`useAddToPlaylist`](apps/mobile/src/screens/library/useAddToPlaylist.tsx) to web
[`ModalPlaylistAddTo`](apps/web/src/components/Modal/ModalPlaylistAddTo.tsx) parity.

Today mobile:

- Appends with `*AddLast` (web adds at **first**)
- Lists private playlists without filtering by the target's medium
- Accepts only `item` | `clip` targets (no soundbite, no add-by-RSS)
- Has no create-playlist shortcut in the sheet
- Calls `req*` from the hook instead of `playlistRepository`

### Add position and filtering

- Switch all add paths to `*AddFirst` (item, clip, soundbite, add-by-RSS)
- Load private playlists A–Z (or recent — match web's modal: A–Z) through `playlistRepository`
- Filter the sheet list to playlists whose `medium_id` matches the target's medium (AV vs music)
- After a successful add, keep the success notice (`features.playlist.added_to_playlist`); close on
  explicit dismiss

### Target kinds

Widen `AddToPlaylistTarget` to:

| Kind         | Repository call                                       |
| ------------ | ----------------------------------------------------- |
| `item`       | `reqPlaylistResourceItemAddFirst`                     |
| `clip`       | `reqPlaylistResourceClipAddFirst`                     |
| `soundbite`  | `reqPlaylistResourceItemSoundbiteAddFirst`            |
| `add_by_rss` | `reqPlaylistResourceItemAddByRSSAddFirst` (+ payload) |

Wire callers that already know those kinds (player, episode, home rows) so the sheet can open for
them. Do not invent like-toggles here — that is [777](777-defer-liked-playlist-and-row-likes.md).

### Create shortcut

When the user has no matching playlists (or as an always-visible secondary action matching web):

- Affordance labeled `features.playlist.create_playlist`
- Membership-gated on press
- Navigates to `PlaylistCreate` (Library stack). Prefer returning to the prior screen after create;
  if stack isolation makes a seamless return awkward, land on the new detail and record the
  intentional divergence in the plan summary — do not cross-tab jump
  ([`mobile-tab-stack-isolation`](/.cursor/rules/mobile-tab-stack-isolation.mdc)).

### Errors and auth

Unauthenticated: no-op opener or login prompt consistent with existing callers (do not open an empty
sheet). Membership rejections → `handleGateError`. Add failures → `features.playlist.add_error`.

## Acceptance criteria

- Adding always inserts at first position.
- The sheet only lists private playlists of the target's medium.
- Soundbite and add-by-RSS targets can be added when callers pass them.
- Create-playlist shortcut is membership-gated and reachable from the sheet.
- All list / mutate traffic goes through `playlistRepository`.

## Web parity references

- [`ModalPlaylistAddTo`](apps/web/src/components/Modal/ModalPlaylistAddTo.tsx) — A–Z private list,
  medium tabs, add-first, create shortcut
- [`PlaylistAddToButton`](apps/web/src/components/MediaPlayer/Buttons/PlaylistAddToButton.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
