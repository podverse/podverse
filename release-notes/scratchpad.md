## Playlists page opens on Recent

- Surfaces: web
- Change: Signed-out `/playlists` opens Public / Recent unless a sort is saved or present in the
  URL. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_SORT` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_RANGE` can open that
  page on Top for a time window instead.
- Who notices: signed-out visitors of `/playlists`; operators who want the previous Top / Week
  first visit
- Operator steps: set those two keys on the web runtime config only when Top should be the first
  public sort. Range is used only when the sort is `top`.

## Cut-off feed downloads retry, then wait

- Surfaces: workers, parser
- Change: A feed download that ends early is stored as `response_truncated`. That parse tries the
  download three times. Later automatic parses wait 15 minutes, then 1 hour, then 6 hours, then one
  day. A finished parse clears the wait. A forced reparse and a signed-in on-demand refresh skip
  the wait. The channel row is created only after the body parses.
- Who notices: operators watching a feed that never finishes; the catalog once a later download
  completes
- Operator steps: app migrations run through `0022_feed_log_response_truncated.sql`.
  `API_EXPECTED_MIGRATION_FILENAME` is that file. The management marker stays
  `0002_nano_id_v2_min_7.sql`.
