## Playlists page opens on Recent

- Surfaces: web
- Change: Signed-out `/playlists` opens Public / Recent unless a sort is saved or present in the
  URL. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_RANGE` can open that
  page on Top for a time window instead.
- Who notices: signed-out visitors of `/playlists`; operators who want the previous Top / Week
  first visit
- Operator steps: set those two keys on the web runtime config only when Top should be the first
  public sort. Range is used only when the sort is `top`.
