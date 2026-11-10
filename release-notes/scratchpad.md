## Queues and History chip rows leave space above content

- Surfaces: web
- Change: Podcasts / Music chips on Queues and History now use the same `--spacing-2xl` gap below the row as other page chip rows, so empty-state banners and lists no longer sit flush under the chips
- Who notices: listeners on Queues and History
- Operator steps: none

## Login errors use bold danger text

- Surfaces: web, mobile
- Change: Wrong-password and other auth form errors on web login and mobile Login / Sign Up / Forgot Password now render as bold danger-colored text instead of ordinary body or secondary copy
- Who notices: anyone who mistypes credentials or hits an auth form failure
- Operator steps: none

## Mini player stays balanced while another device plays

- Surfaces: web
- Change: The desktop mini-player bottom bar is a three-column grid that keeps the right button column on screen when another device has the audio, and podcast episode/live list rows plus the main scrollport shrink so long titles and descriptions ellipsize instead of widening the page
- Who notices: listeners on podcast pages with the mini-player open, especially with cross-device playback
- Operator steps: none

## Podcast episode list no longer jumps for live items

- Surfaces: mobile
- Change: On podcast channel detail, the episode list waits for the live-item request and publishes that result with the stored episodes in one update, so a live or scheduled row no longer inserts above the list after first paint
- Who notices: listeners opening a podcast that has a live or scheduled livestream
- Operator steps: none

## Queue shows Now Playing at the top

- Surfaces: web, mobile
- Change: The podcast and music queue lists show the item currently loaded in the player in a Now Playing section at the top of the matching medium’s queue, including when that item was never added to the queue
- Who notices: listeners opening Queue / Queues while something is playing or paused
- Operator steps: none

## Push sends log accepted and failed counts

- Surfaces: workers, parser
- Change: Each push leg now logs how many Firebase, Web Push, and UnifiedPush sends were
  accepted or failed, grouped by error code, and whether the artwork was a shrunk WebP, an
  original, or none. Dead tokens and gone endpoints are removed after the send. A
  `podverse_push_send_total` counter records the same outcome. Stored images stay WebP.
- Who notices: operators debugging push delivery
- Operator steps: deploy a workers image with this change, then look for `Push send result`
  in the parser log on the next episode

## About and Summary show the full notes

- Surfaces: mobile
- Change: Channel About and item Summary (episode, track, livestream, full player, Add by RSS)
  show the full stored description on first paint. Show more / Show less is no longer offered
  for that prose. The shortened-notes link still appears when Podverse cut the stored text.
- Who notices: listeners reading About or Summary on mobile
- Operator steps: none

## Large play buttons center the play triangle

- Surfaces: web, mobile
- Change: The play triangle inside large circular player buttons (desktop and mobile player
  bars, detail-header play, full player, make-clip transport) shifts one pixel to the right so
  it reads centered. Pause is unchanged. List-row play circles are unchanged. Named
  `play-icon-optical-nudge` / `PLAY_ICON_OPTICAL_NUDGE` so the shift can be set to zero later.
- Who notices: listeners looking at the main play control while paused
- Operator steps: none

## Episode list clears an unseen dot on play or open

- Surfaces: web, mobile, api
- Change: On a podcast or add-by-RSS channel visit, newer episode rows still show an unseen
  accent dot until you leave and open the channel again. Playing a row, or opening its detail,
  clears only that row’s dot for the rest of the visit. Web now shows the same dots on channel
  and add-by-RSS episode lists (signed-in follows only). Mark-seen responses include
  `previous_last_seen_at` so the client can freeze the visit timestamp. Add-by-RSS feeds mark
  seen when opened on web so phone badges clear after sync.
- Who notices: listeners returning from the player or an episode page to a channel’s episode
  list; operators of clients that mark channels seen
- Operator steps: none
