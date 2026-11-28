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

## Playlist tag tables

- Surfaces: api, k8s
- Change: App migration `0023_playlist_tag.sql` adds `playlist_tag` (one folded name, unique, `varchar_short` / 50 characters) and `playlist_tag_assignment` (names in order). The assignment table does not cap the count at 5. A name with no playlist left is removed at commit. `API_EXPECTED_MIGRATION_FILENAME` advances to that file. The management marker stays `0002_nano_id_v2_min_7.sql`. No HTTP field yet.
- Who notices: operators applying app migrations
- Operator steps: app migrations run through `0023_playlist_tag.sql`

## Playlists page type and medium defaults

- Surfaces: web
- Change: `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TYPE` and `NEXT_PUBLIC_PLAYLISTS_DEFAULT_MEDIUM` set the opening type and medium on `/playlists` when the visitor has no saved choice and the URL does not name one. Blank type keeps signed-in My Playlists and signed-out Global. Medium blank or `all` opens All. A saved choice and an explicit URL still win. Browse playlists does not read these.
- Who notices: operators who set the vars, and visitors on a frontend where they are set
- Operator steps: set them on the web sidecar. Leave type blank to keep today's opening. Type is `private`, `private_followed`, or `public`. Medium is `all`, `av`, or `music`.

## Playlist tags on create, edit, and read

- Surfaces: api
- Change: The playlist owner can save tags on create and edit. The API allows `PLAYLIST_TAG_MAX_PER_PLAYLIST` tags (unset means 5) and `PLAYLIST_TAG_NAME_MAX_LENGTH` characters per name (unset means 50). A longer list or a longer name is rejected with a sentence that names the configured number. A character value above 50, or a count above 32767, keeps the API from starting. A count may be higher than 5. Omitting tags on edit leaves them in place. Playlist list and detail payloads include `tags` as folded names. Public and unlisted playlists include them for anyone who can see the playlist. A private playlist includes them for the owner and omits the key for everyone else. An older stored playlist payload with no `tags` field still parses.
- Who notices: playlist owners, anyone reading a public or unlisted playlist, and operators who set the two limits
- Operator steps: leave the two API env vars unset or set them. The character cap cannot be above 50. The count can be above 5. The app migration is the playlist tag tables entry.

## Playlist tag name search

- Surfaces: api
- Change: `GET /playlist/tag?q=` returns up to 10 folded tag names that start with the typed text, ignoring case. Names that exist only on private playlists are left out. The search does not save a tag.
- Who notices: playlist editors, once the apps call this route, and any client that looks up a public tag name
- Operator steps: none

## Playlist page shows its tags

- Surfaces: web
- Change: The playlist page lists a playlist's tags as chips under the description. The chips show the stored names in the owner's order. A playlist with no tags keeps the header it has today. The chips are not buttons, and they do not filter a list. The embed player does not list them.
- Who notices: anyone who opens a playlist that has tags
- Operator steps: none

## Public playlist lists filter by tag

- Surfaces: api
- Change: `GET /playlist/public/recent` and `GET /playlist/public/top` take an optional `tag`. The match is the folded name, and it is applied before paging. Leaving `tag` off keeps today's lists, including playlists with no tags. An unknown tag is an empty page. Top still hides playlists with a zero count for the chosen range.
- Who notices: clients of the public playlist lists
- Operator steps: none

## Playlist rows show tags

- Surfaces: web, mobile
- Change: A playlist list row shows that playlist's tags on one line at the bottom when the payload includes them. The names stay in the owner's order, separated by commas. A line that reaches the end of the row ends in an ellipsis. The line is on every screen that uses the playlist row, including lists that have no tag filter. A playlist with no tags looks the same as before.
- Who notices: anyone looking at a playlist list
- Operator steps: none

## Playlist detail shows its tags

- Surfaces: mobile
- Change: Opening a playlist shows its tags as chips under the description, in the owner's order, with no remove control. A playlist with no tags keeps the detail card it has today. The chips match the web playlist page. The embed player stays a player.
- Who notices: anyone who opens a tagged playlist on the phone
- Operator steps: none

## Browse playlists can filter by one tag

- Surfaces: mobile
- Change: On Browse, the Playlists list has a Tag control. Choosing a tag shows public playlists with that tag, and clearing it shows the full public list again. The choice is remembered on the device. The typed text in the sheet is not. My Playlists and Subscribed do not have this control, and there is no mobile env default for it.
- Who notices: people browsing public playlists on the phone
- Operator steps: none

## Public playlist lists can filter by tag

- Surfaces: web
- Change: Global on `/playlists` and Browse playlists show a tag filter the visitor can change or clear. My Playlists and Subscribed do not. `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` is the opening tag on `/playlists` only and is blank by default. A saved choice and an explicit `?tag=` still win. Browse playlists does not read that env.
- Who notices: visitors on the public playlist lists, and operators who set the tag env
- Operator steps: set `NEXT_PUBLIC_PLAYLISTS_DEFAULT_TAG` on the web sidecar to a tag name, or leave it blank

## Playlist tags on web create and edit

- Surfaces: web
- Change: Playlist create and edit can add, change, and remove tags. The count and the character cap come from public config, and are 5 and 50 when that request fails. At the count, the text box hides and a sentence names that count. Typing stops at the character cap. Enter adds the typed name as a chip. Submit also saves text still in the box. A new name is stored only when the playlist is saved. A failed tag search shows the generic error on the field, and Enter and Submit still add the typed name.
- Who notices: people who create or edit playlists on the web
- Operator steps: none

## Public client config

- Surfaces: api, web, mobile, ops
- Change: `GET /config` returns one public body with three groups. `membership` is the catalog `GET /product/membership` used to return. `playlistLimits` is the tag count and the character cap (`PLAYLIST_TAG_MAX_PER_PLAYLIST` and `PLAYLIST_TAG_NAME_MAX_LENGTH`; unset means 5 and 50). `instance` is brand name, legal name, contact email, signup mode, terms version, taste-profile agreement version, and stats retention days. `GET /product/membership` is removed. Pricing, comparison, and the management membership editor stay. Web and mobile use this response. When the request fails, they keep the env values they already had. The playlist form uses 5 tags and 50 characters until the limits arrive. API URLs, web-only infrastructure, and Home, Browse, and playlists opening defaults stay on the client.
- Who notices: website and phone users of a server whose brand, signup mode, or membership prices differ from the copy on that client; anyone who called `GET /product/membership`
- Operator steps: set the two playlist-tag keys on the API. 5 and 50 match the previous constants. A character value above 50 keeps the API from starting. Leave the client copies of the seven instance settings in place; they apply only when `GET /config` fails.

## Tags on mobile playlist create and edit

- Surfaces: mobile
- Change: Creating or editing a playlist on the phone can include tags. The count and the character cap come from public config, and are 5 and 50 until that response arrives or if the request fails. At the count, the text box hides and a sentence names that count. Typing stops at the character cap. Return adds the typed name as a chip. Save also saves text still in the box. A new name is stored only when the playlist is saved. A failed tag search shows the generic error on the field, and Return and Save still add the typed name. Removing every tag and saving clears them.
- Who notices: someone creating or editing a playlist in the phone app

## Add by RSS People lists cast and guests on the device

- Surfaces: web, mobile
- Change: Add by RSS podcast, album, and artist pages show a People chip when the stored feed
  has channel people or people on episodes or livestreams. Cast is the channel people.
  Appearances groups item and livestream people, counts each person once per item, and keeps
  the latest image. A guest who exists only on an episode still opens People. Web episode,
  track, and livestream pages list that item's people. A website link opens the website. No
  name opens a person page, and these credits are not saved as public people.
- Who notices: listeners who follow a feed by RSS
- Operator steps: none

## Untrusted server fetches use one outbound check

- Surfaces: web, workers
- Change: the image proxy, image shrink, feed probe, publisher-feed discovery, and media URL
  resolution use the DNS-checked outbound policy. The connection stays on an address that passed
  the check, and a redirect is checked the same way.
- Who notices: an image or feed URL that pointed at a private or loopback address no longer loads through the server. Ordinary public URLs are unchanged.
- Operator steps: none
