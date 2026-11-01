## Mobile channel list rows drop the More ellipsis

- Surfaces: mobile
- Change: Podcast, album, and artist list rows no longer show a More (ellipsis) control,
  including Home, Browse, Search, and Recommendations. Channel actions stay on swipe-left
  (and the matching grid long-press). Recommendations Hide moves from the More menu to that
  swipe. Episode, clip, track, and livestream rows keep More. Web Search was already tap-only.
- Who notices: anyone browsing subscribed, recommended, or search show rows in list view
- Operator steps: none

## Mobile Live badge on channel artwork uses a solid red fill

- Surfaces: mobile
- Change: Home list and grid Live pills that sit on channel cover art use a solid red fill so the
  white Live label stays readable on light or busy images. Live badges on the page background
  (date line without artwork, livestream play band) stay translucent.
- Who notices: anyone with a subscribed channel that is currently live, in list or grid view
- Operator steps: none

## Mobile livestream status beside Play is larger and centered

- Surfaces: mobile
- Change: Live, Scheduled, and Ended badges in an item row's play band use medium badge type
  (body-size label) and sit vertically centered with the Play control.
- Who notices: anyone browsing livestream item rows on Home or channel detail
- Operator steps: none

## Mobile episode rows give the title the header width

- Surfaces: mobile
- Change: On episode and clip list rows, the one-tap download control sits in the play row,
  immediately left of More. The title, show name, and date use the full header width. Track rows
  keep download immediately left of More in the title row, because those rows have no play band.
- Who notices: anyone looking at episode or clip lists, including a podcast's episode list
- Operator steps: none

## Mobile Downloads rows hide Remove until swipe and match list title sizes

- Surfaces: mobile
- Change: My Library → Downloads keeps Remove under the row until a left swipe. Podcast rows
  show the channel title, item title, and publish date in the same sizes as episode list rows.
  Music rows show the album (or artist) overline, track title, and artist when available.
- Who notices: anyone with offline downloads in My Library
- Operator steps: none

## Notifications inbox rows span the divider

- Surfaces: web, mobile
- Change: Each inbox notification starts and ends flush with the divider between rows. The
  unseen dot is painted on the artwork's leading edge and no longer shortens the row.
- Who notices: anyone reading the notifications inbox on web or mobile
- Operator steps: none

## Mobile More menu opens on List View and Grid View

- Surfaces: mobile
- Change: The Home, Browse, and For Me overflow menus no longer show a Change Layout View
  heading above List View and Grid View. Those options are the first rows in the sheet.
- Who notices: anyone switching list and grid from the title-bar More button
- Operator steps: none

## Mobile down-caret screens dismiss on a downward drag

- Surfaces: mobile
- Change: Full player, Search (root), image viewer, notifications inbox, and login / sign up
  dismiss when the finger drags down from the header band, matching the down-caret control, on
  iOS and Android. Nested Search pages, Make Clip, Forgot Password, and V4V keep back / no-drag
  behavior.
- Who notices: anyone closing those screens with a swipe from the top
- Operator steps: none

## Web item-row More stays beside Play; livestream rows hide progress

- Surfaces: web
- Change: On episode, clip, soundbite, and Add by RSS episode list rows, the More control stays
  immediately to the right of Play while that row shows a playback progress bar. The bar grows
  after More. Livestream list rows (database and Add by RSS) no longer show a progress bar in the
  play cluster, including while the livestream is playing.
- Who notices: anyone playing from a web item list, or watching a livestream from a list row
- Operator steps: none

## Recommendations Edit and Add by RSS chip actions

- Surfaces: web, mobile
- Change: The Recommendations control says Edit on web and mobile. On mobile it is a chip-shaped
  action beside the media chips, with the same height and padding as those chips and a primary
  border. Add by RSS on mobile drops the title-bar plus and shows Add Feed and Check for Updates
  in that same chip-action row. Check for Updates refreshes the Add by RSS library. Empty
  placeholder copy on web and mobile sits at the top of the content column, under the chips,
  with the usual content gap. Loading spinners stay centered.
- Who notices: anyone opening Recommendations or Add by RSS, and anyone who hits an empty list
- Operator steps: none

## Accordion caret sits on the label midline

- Surfaces: web
- Change: Shared accordion headers keep the chevron vertically centered on the label for a
  single line or a wrapped block, including Taste Profile settings and the sidebar My Library
  row.
- Who notices: anyone opening a web accordion whose label looked high or low against the caret
- Operator steps: none

## Search and notifications on every tab root

- Surfaces: mobile
- Change: Search and the notifications bell show on the root of every bottom tab (Home, Browse,
  For Me, My Library, More). A screen pushed on a tab, and a tab opened from More, keep Back and
  do not show those icons. A long tab title ellipsizes between the icons. Search still slides up
  from the bottom. A parsed search result closes Search and opens that channel from Home's root
  when this device follows it, otherwise from Browse's root (or More overflow when that tab is
  hidden). A result that is not in the database yet stays on the Search add page. When Add
  finishes, the channel opens only if that add page is still on screen. Search keeps the query,
  the All/Music chip, and the result rows in memory for the session and shows them again without
  a new request until the query or chip changes. Clearing the field drops that memory.
- Who notices: anyone using Search or the notifications bell, and anyone opening a channel from
  search results
- Operator steps: none

## Profile content uses chips, and mobile drops the bordered card

- Surfaces: web, mobile
- Change: Own and public profile pages switch Podcasts, Albums, Playlists, and Clips from tabs
  to a chip row, with the current sort last (A-Z or Recent). When that sort has no other
  choices, the face still shows the order and has no down caret. On mobile, My Profile puts
  My Profile in the title bar, the display name (or Anonymous) as the page heading, and the
  same chips above an unboxed list; the public profile list matches and Share sits in the
  title bar.
- Who notices: anyone opening their own profile or another person's profile on web or mobile
- Operator steps: none

## Item list rows show the date only

- Surfaces: web, mobile
- Change: Episode, clip, track, livestream, queue, playlist, Downloads, Add by RSS, and related
  list and grid rows show the publish (or start) calendar date without the clock time. Item
  detail headers and the embed player still show date and local time. Episode length next to
  Play is unchanged.
- Who notices: anyone scanning episode or similar lists on web or mobile
- Operator steps: none

## Recommendations weights apply from the number, and hiding a show says so

- Surfaces: web, mobile
- Change: On Settings → Recommendations, shows that affect recommendations no longer list a
  last-listened date or "Automatic from your listens." Weight is buttons 1–5 and saves when a
  different number is chosen. An X at the end of that row moves the show to Removed from
  Recommendations and tells the listener it was moved to hidden from recommendations. That
  section's explanation says those shows will not affect recommendations, and that taking a show
  off the list includes it in the recommendation algorithm again.
- Who notices: anyone adjusting which shows affect their recommendations
- Operator steps: none

## Mixed episode lists name the channel above the item title

- Surfaces: web, mobile
- Change: On Home, Browse, queues, playlists, history, and Add by RSS libraries, episode, track,
  clip, and livestream rows show the channel (or album) title above the item title in a smaller
  line. Channel and single-feed detail pages still omit that line. Mobile Home fills the show
  name from the local follow when a stored episode payload has no nested channel title. Web
  Add by RSS mixed list rows gained the same channel line (grid cards already had it).
- Who notices: anyone scanning mixed episode lists on web or mobile
- Operator steps: none

## Search and notifications only on Home

- Surfaces: mobile
- Change: Search and the notifications bell sit in the Home title bar only. Browse, For Me,
  My Library, and More roots keep their own trailing actions and no longer show those two
  icons. A screen pushed on a tab, and Home opened from More, still omit them.
- Who notices: anyone looking for Search or the notifications bell from a non-Home tab
- Operator steps: none

## Mobile item detail header art, type, and download placement

- Surfaces: mobile
- Change: Episode, track, and Add by RSS item detail pages show a full-width square cover on
  phone (capped and centered on tablet), a larger channel or album name and publish date, and
  the download or trash icon immediately left of More. Empty clips and other empty pane copy
  sit under the section chips instead of covering them.
- Who notices: anyone opening an episode, track, or Add by RSS item page
- Operator steps: none

## Browse category chip clears on the first press

- Surfaces: web, mobile
- Change: On Browse Podcasts, Episodes, and Clips, pressing the chip while it names a category
  (for example Technology) clears that category and shows the unfiltered list. The next press
  opens the category picker. Choosing a category again names it on the chip, and the press after
  that clears it once more. Pressing the chip while the picker is open closes the picker.
- Who notices: anyone filtering Browse by category on web or mobile
- Operator steps: none

## Web channel About, Podroll, People, and Remote Items are chips

- Surfaces: web
- Change: Podcast, album, artist, and Add by RSS channel pages no longer put About, People,
  Podroll, or Remote Items in the side column. Those sections are chips at every width, in the
  same order as mobile: after the main list chips, then Podroll, Remote Items, Boosts, People,
  and Settings. The side column stays in the page layout and is empty.
- Who notices: anyone opening a podcast, album, or artist page on a wide screen
- Operator steps: none

## Web media chips no longer flash a scrollbar while the list loads

- Surfaces: web
- Change: On Subscribed, Browse, Recommendations, and Add by RSS, pressing a media chip no
  longer grows the page past the scroll area while the list loads. The loading block fills the
  leftover space under the chips instead of forcing a full viewport height, so a scrollbar does
  not appear and disappear on each click.
- Who notices: anyone switching media chips on those pages
- Operator steps: none

## Web media chips use one full-page loading spinner

- Surfaces: web
- Change: Pressing a media chip on Subscribed, Browse, Recommendations, or Add by RSS shows the
  same full-viewport loading overlay used elsewhere, as soon as the chip is pressed. The under-chip
  list spinner is gone, so two spinners no longer appear during a chip switch.
- Who notices: anyone switching media chips on those pages
- Operator steps: none

## Web list pagination stays hidden until the new chip's results arrive

- Surfaces: web
- Change: Pressing a section, sort, category, or medium chip next to a paged list removes the
  page controls in that same click. They come back only after that list's page count is ready, so
  a channel's Episodes control cannot jump to the top while Clips (or another section) is still
  loading. Changing pages keeps the controls in place.
- Who notices: anyone switching chips on a paged channel, episode, album, history, or directory
  list
- Operator steps: none

## Device locale updates stop failing with a read-role permission error

- Surfaces: api
- Change: Updating the locale on FCM, web push, and Unified Push device rows (and deleting all
  Unified Push devices for an account) runs on the read-write database role instead of the
  read-only role. Accepting notifications on mobile no longer gets a 500
  `permission denied for table account_fcm_device` from `PUT /account/fcm-device/update-locale`
  (same for the webpush and up-device locale routes).
- Who notices: anyone who enables push notifications on iOS or Android against an API that uses
  separate read and read-write Postgres roles
- Operator steps: restart the API so it loads the ORM change

## Mobile empty lists use a glow banner

- Surfaces: mobile
- Change: Empty-list sentences (Downloads, Browse, Search, clips, history, and the same
  "nothing here" lines elsewhere) render as EmptyStateText: 24pt light type on the glow
  background, matching the web empty banner. A follow-up button, when the empty state has one,
  stays under that banner.
- Who notices: anyone opening a list that has no rows
- Operator steps: none

## Mobile chip page actions sit above the chips

- Surfaces: mobile
- Change: On Recommendations and Add by RSS, page actions (Edit, Add Feed, Check for Updates)
  always sit in a band above the media-type chips instead of sharing the chip line when both
  fit. The action group wraps on its own line when labels do not fit side by side.
- Who notices: anyone on Recommendations or Add by RSS on a phone
- Operator steps: none

## My Profile name sits a little farther above the chips

- Surfaces: mobile
- Change: On My Profile, the space under the display name (before Podcasts, Albums, and the
  other chips) is `spacing.base` (12) instead of `spacing.md` (8).
- Who notices: anyone opening My Profile
- Operator steps: none

## Mobile profile shows the bio under the name

- Surfaces: mobile
- Change: My Profile and another person's profile show the account bio under the display
  name, in secondary reading type, when a bio is set. A blank bio adds no line. On My Profile
  the name stays in the page body. On another person's profile the name stays in the title bar
  and the bio sits under it.
- Who notices: anyone opening a profile that has a bio
- Operator steps: none

## Mobile Downloads shows transferred size while downloading

- Surfaces: mobile
- Change: On My Library → Downloads, an in-progress row that is actively downloading appends
  transferred size after “Downloading Episode” on the same line (for example
  `Downloading Episode 1.5 MB / 45 MB`), updating with the progress bar. When only bytes written
  are known, the transferred size alone appears; when neither is known, the words stay as they
  were.
- Who notices: anyone watching a download in My Library → Downloads
- Operator steps: none

## Empty lists name the missing content

- Surfaces: mobile, web
- Change: Browse no longer says "Nothing to Show Yet". An empty Podcasts, Episodes, Clips,
  Artists, Albums, Tracks, Livestreams, Playlists, or Users list says "No Podcasts Found" (and
  the matching line for each type). Add by RSS library chips, episode and track lists, artist
  albums and tracks, and profile tabs use those same lines. My Clips says "No Clips Found".
  About with no description says "No Summary Available".
- Who notices: anyone opening an empty Browse, Add by RSS, profile, or My Clips list
- Operator steps: none

## Mobile chip loading spinner stays put without a Loading label

- Surfaces: mobile
- Change: When switching media-type chips on Home, Browse, and similar lists, the centered
  spinner is large, has no visible "Loading" label, and stays in one place for the whole load
  instead of jumping up when the list takes over.
- Who notices: anyone switching Podcasts / Episodes / Clips (and other chips) on Home or Browse
- Operator steps: none

## Web empty lists use the same banner

- Surfaces: web
- Change: Empty History, Queues, notifications, recommendations, livestreams, search with no
  matches, a filtered subscription list, boost messages, taste-profile lists, removed content,
  API keys, About or Summary with no description, and empty episode, clip, track, chapter, and
  transcript sections use the same glow empty banner as "No Podcasts Found" and "No Clips Found".
- Who notices: anyone opening a list or section that has nothing to show
- Operator steps: none

## Create Playlist button is text only

- Surfaces: web
- Change: The Create Playlist button on the Playlists page no longer shows a plus icon inside
  the button.
- Who notices: anyone looking at the Playlists page while signed in
- Operator steps: none

## Web buttons center an icon with its label

- Surfaces: web, management-web
- Change: A button that shows an icon beside its label uses the shared `icon` slot on `Button`
  (`iconPosition` chooses the side). The glyph is the same size as the label and shares its
  vertical center. Add Feed and RSS Link on a directory or remote-feed page use that slot, and
  a dropdown chevron does too.
- Who notices: anyone looking at Add Feed or RSS Link
- Operator steps: none

## Profile content rows open their detail screens

- Surfaces: mobile
- Change: Tapping a podcast, album, clip, or playlist on My Profile or another person's
  profile opens that content on the same navigation stack. Back returns to the profile.
- Who notices: anyone opening content listed on a profile page
- Operator steps: none

## Episode descriptions sit clear of the artwork

- Surfaces: mobile
- Change: On episode and clip lists, the description sits 12pt under the artwork and title
  block, the same gap as the space beside the artwork. It was 2pt, so the paragraph sat on the
  image when it wrapped underneath.
- Who notices: anyone reading an episode or clip description on Home, a channel page, or Search
- Operator steps: none

## Recommendations Edit is in the more menu

- Surfaces: mobile
- Change: On Recommendations, Edit is a row in the more menu, under List and Grid. It opens
  Taste Profile settings. Signed out, the row is omitted. The media-type chips start the page
  body.
- Who notices: anyone signed in on the Recommendations tab
- Operator steps: none
