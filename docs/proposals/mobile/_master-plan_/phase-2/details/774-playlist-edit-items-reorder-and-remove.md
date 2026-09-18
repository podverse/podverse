# 774-playlist-edit-items-reorder-and-remove

**Master step:** P2.1.6
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Owner-only **edit-items mode** on playlist detail: long-press whole-row drag to reorder, swipe to
remove. Extends today's reorder toggle (Move up / Move down buttons) into the web Items-tab
behavior without a separate Edit Items route.

**Depends on** the completed queue set: `ReorderableSections` long-press body-drag prop and the pure
drop resolver that maps index → first / last / between
([759](759-queue-reorder-long-press-drag.md)). Playlist reuses those; it does not fork a second
reorder engine ([`mobile-reusable-components`](/.cursor/skills/mobile-reusable-components/SKILL.md)).

### Edit-items mode

- Visible only to the owner; toggle with `features.playlist.reorder` / `misc.done` (keep existing
  `library-playlist-detail-reorder-toggle` testID)
- While on: load **private-all** resources through `playlistRepository` (web Items tab)
- While off: stay on the paginated view list from [773](773-playlist-detail-parity.md)

### Reorder — long-press drag

Whole-row long-press drag, same arbitration contract as the queue:

1. Quick tap still plays (and does not lift the row)
2. Horizontal swipe still reveals Remove
3. Drag does not fire play on release

Drop math mirrors web's `handleDragEnd` in
[`ListPlaylistResources`](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx):

| Drop index       | Call                                                    |
| ---------------- | ------------------------------------------------------- |
| `0`              | `*AddFirst`                                             |
| `length - 1`     | `*AddLast`                                              |
| anything between | `*AddBetween(prev.list_position, next.list_position)`   |

Dispatch on the moved resource's type (item, clip, soundbite, add-by-RSS) via `playlistRepository`.
Neighbor positions come from the **reordered** array. Prefer extracting a shared pure helper with
the queue resolver if the shapes already match; otherwise a playlist-local tested pure function is
fine — do not duplicate divergent arithmetic
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

Accessibility: keep Move up / Move down as `accessibilityActions` on adjustable rows, routed through
the same resolver ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

Haptics / spring / custom drag chrome stay deferred under
[599](599-defer-pixel-dnd-polish.md).

### Remove — swipe-only

`SwipeActionRow` with `features.playlist.remove_from_playlist`, testID
`playlist-row-${playlistResourceId}-swipe`. Delete via the matching
`reqPlaylistResource*Delete` wrapper on `playlistRepository`. Optimistic splice; roll back and show
`features.playlist.remove_error` on failure. Membership rejections →
`useMembershipGate().handleGateError`.

No persistent inline Remove button and no More-menu remove row in this mode (web's more-menu remove
is the desktop equivalent; mobile standardizes on swipe like queue / downloads).

### Failure handling

Failed reorder reloads from the server rather than keeping the optimistic order. Failed remove
restores the row.

## Acceptance criteria

- Owner can enter edit-items mode; non-owners never see the toggle.
- Long-press drag reorders via first / last / between; Move up / Move down accessibility still works.
- Swipe removes for item, clip, soundbite, and add-by-RSS resources.
- Tap / swipe / drag do not cross-trigger.
- Tab bar settings reorder behavior is unchanged.

## Web parity references

- [`ListPlaylistResources`](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx) —
  `isEditMode`, `handleDragEnd`, remove callbacks
- [`PlaylistEditPageList`](apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageList.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
