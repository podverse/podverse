# 05 — Playlist edit: read-only type (medium) + default-likes edit rules

**Supersedes the original text** (“lock medium only for `is_default_likes`”) in favor of the **stricter** product + API: **after create, playlist type (medium) is never user-editable**; default-likes playlists still have the usual **title** + **sharable** editing where allowed.

## Web

- [PlaylistForm](../../../apps/web/src/components/Playlist/PlaylistForm.tsx): when `edit_playlist_id_text` is set (**any** edit, not only default-likes), **medium** is a **disabled** field (read-only label from `MEDIUM` menu). Create flow still uses a dropdown to pick medium **once**.
- [PlaylistEditPageForm](../../../apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageForm.tsx): `reqPlaylistEdit` does **not** send `medium`.

## API / ORM

- `PATCH` does not accept or apply `medium` / `medium_id` for any playlist.  
- `is_default_likes` playlists: same update fields as other playlists; deletion / other rules unchanged.

## Tests

- [ ] `PlaylistForm` behavior covered by page/unit tests **if** the repo pattern already has an edit test file; else note waiver in [06](./06-tests-e2e-and-verification.md).

## Definition of done (05)

- [ ] Edit screen never offers a way to **change** medium; API cannot persist a medium change on update
