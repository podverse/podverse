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

## Page column stops stretching on a wide window

- Surfaces: web
- Change: Lists, grids, and the page body under the header stop growing past 80rem
  (`--content-max-width`). A wider window leaves empty space on the right of that column. The nav
  bar, the player bar, and a channel header's background still span the area beside the sidebar.
- Who notices: people on wide monitors, on episode and track lists and on card grids
- Operator steps: none

## Episode and track lists stay up while rows load

- Surfaces: web
- Change: Episode and track lists render their rows as their own components. Opening a show or
  album no longer crashes when the list starts empty and then fills in. Livestream, profile,
  artist, and album lists use the same render path.
- Who notices: people opening a podcast or album page
- Operator steps: none

## People directory, popularity, and recommendations

- Surfaces: api, web, mobile, workers, orm, k8s
- Change: A person is one row per standardized name. Channel People lists Cast and Appearances.
  Browse has a People chip with name search, Recent, and Popularity. A person page lists that
  person's shows and items, and an account can follow a person without notifications. Person
  popularity counts distinct listeners on credited items and channels during the nightly refresh.
  Recommendations grow a People chip from the shows already recommended to that listener.
- Who notices: visitors browsing people, opening a channel's People section, and anyone with
  recommendations turned on
- Operator steps: app migrations run through `0023_person.sql`, which creates `pg_trgm`.
  `API_EXPECTED_MIGRATION_FILENAME` is that file. The management marker stays
  `0002_nano_id_v2_min_7.sql`. Regenerate the linear baseline after the migration applies.
  Person popularity and person recommendations are filled by the existing nightly stats jobs.
