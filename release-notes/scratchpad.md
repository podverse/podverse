## Browse Top for podcasts and episodes lists only content with listens in the range

- Surfaces: api; web and mobile Browse read it
- Change: `GET /channel/global/top`, `/channel/category/top`, `/item/global/top`, and
  `/item/category/top` return only entities whose count for the chosen range is above zero. A range
  with nothing above zero returns an empty `data` array instead of the Recent list, and a short
  ranked page is no longer padded with Recent rows. `GET /live-item/global/top` and
  `/live-item/category/top` keep the recent pad, so a short page and an all-zero range still include
  live items whose count is zero. Subscribed Top (`/channel|item|live-item/subscribed/top`) and a
  channel's episode Top (`/item/channel/top/:channelIdOrIdText`) still pad a short page with recent
  rows. Recent routes and Browse Livestreams are unchanged.
- Who notices: Browse users on web and mobile on an instance with little listening data, where Top
  for podcasts and episodes shows fewer rows or an empty list; API clients of those four routes
- Operator steps: none

## Public Top lists for clips, playlists, and profiles leave out zero counts

- Surfaces: api
- Change: `GET /clip/public/top`, `GET /clip/public/category/top`, `GET /playlist/public/top`,
  and `GET /account/top` return only rows whose count for the chosen range (day, week, month, or
  all time) is above zero. A range with no counted activity returns an empty list instead of every
  clip, playlist, or profile that once had activity, ranked by zero. `meta.count` on the category
  clip list counts only those rows. Subscribed Top, owner and followed playlist Top, and the clip
  Top lists on podcast and episode pages are unchanged.
- Who notices: web and mobile Browse users choosing Top for clips, playlists, or profiles; API
  clients reading those routes
- Operator steps: none

## Web Browse opens on Top for the past week

- Surfaces: web
- Change: every Browse list (podcasts, episodes, clips, artists, albums, tracks, users) opens on
  Top with the Week range until the listener picks another sort for that list. The choice is
  remembered per list in this browser. Public playlists already opened on Top / Week. A browser
  that already saved a sort for a list keeps it, including Recent saved automatically on an
  earlier visit. The Profiles page still opens on Recent; Home lists are unchanged. A Top sort
  with no range now always means the past week.
- Who notices: anyone browsing on web
- Operator steps: none

## Public playlists Recent read

- Surfaces: api, web, mobile (shared request helper)
- Change: new public `GET /playlist/public/recent?medium=&page=` returns public playlists, most
  recently created or updated first (`last_updated`). `reqPlaylistGetMany` with `type: 'public'`
  and `sort: 'recent'` now calls it; every other public sort still calls Top. Public
  playlist Top and Recent both return `meta: { page, count: null, limit }`, so web and mobile can
  page past the first page of public playlists. Both return `last_updated` on each playlist.
- Who notices: web visitors on public playlists and Browse; API clients
- Operator steps: none

## Web Browse empty list messages

- Surfaces: web, i18n catalog (consumer)
- Change: an empty Browse list now says so ("No Podcasts Found", "No Episodes Found", "No Clips
  Found", "No Artists Found", "No Albums Found", "No Tracks Found", "No Playlists Found", "No
  Users Found") in place of a blank page, for example Top for a range with no listens. New
  consumer keys `media.music.no_artists_found` and `features.browse.no_users_found` in en-US, es,
  fr, and el-GR.
- Who notices: anyone browsing on web; translators reviewing the two new strings
- Operator steps: none

## Public playlists Recent sort on web

- Surfaces: web
- Change: Browse playlists and the Playlists page offer Recent beside Top for public playlists.
  Recent lists them by last update. The sort chip still opens on Top (Week) until the listener
  picks Recent, which this browser then remembers.
- Who notices: listeners browsing public playlists
- Operator steps: none

## Mobile Browse adds a Recent sort, opens on Top for the week, and keeps a sort per media type

- Surfaces: mobile
- Change: The Browse sort chip offers Recent and Top for podcasts, episodes, clips, artists,
  albums, tracks, playlists, and users. Livestreams still have no sort. Choosing Top opens a
  second sheet for the window (day, week, month, all-time), and the chip face then shows that
  window. Every Browse media type opens on Top for the past week until the listener changes it,
  the same as web Browse. Each media type remembers its own sort and window on the device, the
  way Home does, so choosing Recent on Episodes leaves Podcasts on Top. A window chosen before
  this build applied to every type and is not carried over, so every type opens on the week
  after updating. With the API change in this release, a Top window with no listens shows
  Browse's empty state ("Nothing to Show Yet") instead of Recent rows, and a short Top page ends
  the list. Playlists Recent uses the new public playlists Recent read. `@podverse/helpers` adds
  `browseListScope`, the shared key for one Browse media type's remembered choices.
- Who notices: mobile listeners on Browse; anyone who had picked a window other than the week
  sees the week after updating
- Operator steps: none
