# 775-playlist-form-parity-and-delete

**Master step:** P2.1.6
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

Bring [`PlaylistFormScreen`](apps/mobile/src/screens/library/PlaylistFormScreen.tsx) to web create /
edit parity. Today: title, description, hand-rolled sharable-status chips, medium hardcoded to
`'av'` (music playlists cannot be created), no delete.

### Create and edit fields

Mirror [`PlaylistForm`](apps/web/src/components/Playlist/PlaylistForm.tsx):

| Field            | Create                         | Edit                                      |
| ---------------- | ------------------------------ | ----------------------------------------- |
| Title            | Required                       | Required                                  |
| Description      | Optional                       | Optional                                  |
| Medium           | `OptionChipGroup` AV / Music   | Read-only (locked after create)           |
| Sharable status  | `OptionChipGroup` public / unlisted / private | Same                             |

Replace the hand-rolled chip `Pressable`s with `OptionChipGroup`
([`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc)). Default
create values match web: AV medium, Private sharable status.

Submit through `playlistRepository` (`create` / `edit`). Membership rejections →
`useMembershipGate().handleGateError`. Create still `navigation.replace`s to detail on success.

### Delete playlist

On edit only, for the owner:

- Destructive control labeled `features.playlist.delete_playlist`
- Confirm with `ConfirmDialog` and `features.playlist.delete_playlist_confirm`
- On confirm: `playlistRepository.delete`, then navigate back to `LibraryPlaylists` (not detail)
- Surface `errors.generic` (or a dedicated key if one already exists) on failure; never silent catch
  ([`mobile-surface-async-errors`](/.cursor/rules/mobile-surface-async-errors.mdc))

Delete is membership-tier for the mutation path the API already enforces; route gate errors the same
way as save.

### Auth

Signed-out create / edit continues to use `CallToActionSection` + `authentication.login_required`
([`generic-login-required-copy`](/.cursor/rules/generic-login-required-copy.mdc)).

## Acceptance criteria

- Create can choose AV or Music; edit shows medium as locked.
- Sharable status uses `OptionChipGroup` with the three existing statuses.
- Owner can delete a playlist after confirmation and lands on the Library playlists list.
- Create / edit / delete go through `playlistRepository`; membership gates open on rejection.

## Web parity references

- [`PlaylistForm`](apps/web/src/components/Playlist/PlaylistForm.tsx) — fields, medium lock, delete
- [`PlaylistCreatePageForm`](apps/web/src/app/playlist/create/PlaylistCreatePageForm.tsx)
- [`PlaylistEditPageForm`](apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageForm.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-playlists
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
