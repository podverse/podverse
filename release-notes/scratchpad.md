## Headset play after a pause

- Surfaces: mobile (iOS)
- Change: After a pause, if an interruption ends and nothing else is playing, the app activates
  its audio session again and republishes Now Playing without starting audio. The same reclaim
  runs when the app comes to the foreground. A play press from the lock screen, headset, CarPlay,
  or the in-app control reloads whatever was playing once at its playhead when the player item has
  failed. That is whatever was loaded: an episode, a track, a video, a chapter, a clip, a
  soundbite, or Add by RSS. A clip or soundbite keeps its range. A failed livestream starts at
  live. If the audio session will not activate, play is tried once more without reloading, so a
  healthy playhead stays put. A second failure is reported and playback stays stopped. A listener
  who had paused is still not resumed by the end of a call. Another app that is playing keeps the
  headphones.
- Who notices: listeners who pause, leave the app, and later press play on their headphones or
  the lock screen
- Operator steps: none

## Transcript tab no longer crashes on open

- Surfaces: mobile (iOS; same list code on Android)
- Change: Opening Transcript on an episode, track, or Add by RSS item sticks the filter and
  Autoscroll bar. The page header above it, including the chip row, stays a normal list header.
- Who notices: listeners who open Transcript
- Operator steps: none

## Stale mobile refresh no longer ends the new session

- Surfaces: mobile
- Change: A refresh that was already in flight when the user signed out is ignored if a newer
  session has started. A 401 from `POST /auth/mobile/refresh` is no longer logged as an unexpected
  API error, so the dev error overlay does not cover the app.
- Who notices: someone who signs out and signs back in while a token refresh is still in flight
- Operator steps: none

## Live items without a duration can play

- Surfaces: mobile
- Change: Starting playback no longer treats a missing item duration as "No Playable Media Found."
  A live item with no `item_about` can start.
- Who notices: someone who plays a livestream that has no duration
- Operator steps: none

## Player and list labels stay inside their controls

- Surfaces: mobile
- Change: Marquee titles and list rows stay in the native view hierarchy, so the title text
  remains inside the control that carries it.
- Who notices: VoiceOver on a scrolling player title or a list row
- Operator steps: none

## Video fullscreen stays open

- Surfaces: mobile
- Change: Entering video fullscreen waits until the fullscreen host has laid out before moving
  the picture there. Previously the move happened first, the surface reported that it was not
  presented, and fullscreen closed immediately.
- Who notices: anyone who taps Full Screen on a video
- Operator steps: none

## Transcript section switch no longer hits a list error

- Surfaces: mobile
- Change: Episode, track, Add by RSS, and full-player lists always keep the transcript
  viewability callback. Opening Transcript after another section no longer changes that callback
  from absent to present, which React Native rejects and which was covering the transcript with
  a render error.
- Who notices: listeners who open Transcript after Chapters or another section
- Operator steps: none

## Add by RSS full player transcript keeps the follow bar

- Surfaces: mobile
- Change: The full player's Transcript filter and Autoscroll stay on screen for an Add by RSS
  item once the cues have loaded. They were limited to directory items.
- Who notices: listeners who open Transcript on an Add by RSS item in the full player
- Operator steps: none

## Unseen counts sit on the artwork in accent blue

- Surfaces: web
- Change: Subscription unseen counts and the notification bell count use a regular-weight digit
  on the theme accent, the same blue as the unseen dots in the default theme. On a subscribed
  podcast list row the count sits on the top-right of the artwork, matching the grid.
- Who notices: anyone looking at a subscribed podcast with new episodes, or at the bell count
- Operator steps: none

## Sidebar Search icon lines up with the label

- Surfaces: web
- Change: The magnifying glass on the sidebar Search row aligns with the middle of the word
  instead of sitting on the text baseline.
- Who notices: anyone looking at the sidebar Search row
- Operator steps: none

## Empty queue shows a message under the chips

- Surfaces: web, mobile
- Change: When a signed-in listener opens Queues and the podcast or music queue has no items,
  the page shows “Nothing in Your Podcast Queue Yet” or “Nothing in Your Music Queue Yet” under
  the medium chips at the start of the column (same placement as Recommendations empty copy),
  instead of a blank column.
- Who notices: anyone who opens Queues with nothing queued
- Operator steps: none

## Empty history shows a message under the chips

- Surfaces: web, mobile
- Change: When a signed-in listener opens History and there are no items, the page shows
  “Nothing in Your History Yet” under the medium chips at the start of the column (same
  placement as Recommendations empty copy), instead of a blank column.
- Who notices: anyone who opens History with nothing played yet
- Operator steps: none

## Media-list Sort and layout gear stay on chip click

- Surfaces: web (Subscribed, Browse, Add by RSS, Recommendations)
- Change: Clicking a media chip (Podcasts, Episodes, Clips, and the rest) shows that chip's Sort
  control and layout gear immediately, while the list area still shows the loading spinner. The
  controls match what that chip uses once the list arrives, including chips that have neither.
- Who notices: anyone switching media chips on those pages
- Operator steps: none

## List more button sits between play and date

- Surfaces: web
- Change: On episode, clip, soundbite, and add-by-RSS episode list rows, the more control (and
  source icon when present) sits between the play control and the date with the same gap on both
  sides, instead of at the far right of the row.
- Who notices: anyone browsing History, Queues, podcast episodes, clips, or soundbites in a list
- Operator steps: none

## Live channel recommendations refresh as you listen

- Surfaces: api, workers, web, mobile, k8s (app migration `0003_stats_channel_hidden`)
- Change: For You rebuilds that listener's stored channel recommendations when a show is added to
  the Taste Profile, when its 1–5 recommendation weight steps, when Settings applies a different
  override, or when a show is removed from the Taste Profile. The shared similarity graph still
  runs on the nightly job. Recommendations and Settings add Edit Recommendations, Hide on
  suggestion rows, and a Hidden Channels list that keeps a show off Browse and Recommendations
  without changing Taste Profile influence or subscriptions. Empty-state copy explains live
  updates and the nightly gap for obscure shows.
- Who notices: signed-in listeners with Taste Profile on who open Recommendations after listening
  or after editing weights; anyone who hides a suggestion from Browse or Recommendations
- Operator steps: apply app linear migration `0003_stats_channel_hidden.sql` (or redeploy
  with the regenerated `0004_app_linear_baseline`)

## Escape closes a sort menu opened from its chip

- Surfaces: web, management-web
- Change: Pressing Escape closes an open sort, filter, or other dropdown menu even when focus
  is still on the chip or button that opened it. A dialog behind that menu stays open.
- Who notices: anyone who opens Sort or a similar menu with a click and dismisses it with Escape
- Operator steps: none

## Closed browser leaves playback presence

- Surfaces: api
- Change: When a signed-in browser's account event stream ends because the client closed or the
  write failed, that session cannot check back into playback presence until a newer stream of
  the same session opens. The leave window stays the configured grace (500ms on web end-to-end,
  5 seconds otherwise). A second signed-in browser stops following the closed one after that
  grace instead of for the 40 second check-in lifetime. Play on another page still follows the
  other session until that presence is gone.
- Who notices: a listener with two signed-in browsers, after closing the one that was playing
- Operator steps: none

## Signed-out notice keeps the settings tab

- Surfaces: web
- Change: When another device ends this browser's session while Settings is open on a
  signed-in tab, the address stays on that tab until the "You've Been Signed Out" dialog
  is closed. A settings tab click that is refused because the session already ended still
  opens that tab with the dialog. Closing the dialog moves a logged-out visitor off a
  signed-in tab to General. Opening a signed-in settings tab while logged out still moves
  to General immediately.
- Who notices: someone who was viewing Account or another signed-in Settings tab when
  they were signed out from another device
- Operator steps: none

## Recommendations edit sits with the chips

- Surfaces: web, mobile
- Change: Edit Recommendations shares the media-type chip row when the line is wide enough, and
  sits above that row, aligned to the start, when it is not. Same arrangement as Add Feed and
  Check for Updates on Add by RSS.
- Who notices: signed-in listeners on the Recommendations page
- Operator steps: none

## Listen counts take longer on podcasts

- Surfaces: api, web, mobile
- Change: A podcast, video, or other non-music listen counts at 5 minutes, or at half the length
  when that is shorter. Music stays at 1 minute, or half the length of a track under 2 minutes.
  The length is the file the player loaded for this play when it is close to the RSS duration
  (half to double); otherwise the RSS duration stands. Listens already stored are unchanged, so
  recent charts sit below a count that treated one minute of a podcast as a listen.
- Who notices: signed-in listeners whose Taste Profile and popularity counts come from listening
- Operator steps: none

## Accordion labels line up with the caret

- Surfaces: web
- Change: Expandable accordion rows center the label with the caret. A heading's extra space
  under the title no longer sits inside the row and pushes the words above the caret. A row that
  should stay top-aligned can pass headerAlign="start". Sidebar section headers keep the same
  vertical padding.
- Who notices: listeners on Settings Taste Profile, and other web pages that use the same
  accordion
- Operator steps: none

## Not counted is separate from hidden

- Surfaces: web, mobile, api (Taste Profile agreement and terms)
- Change: The list of shows left out of recommendation scoring is named Not Counted in
  Recommendations. Those shows stay visible. Hidden stays the word for shows the listener does
  not see (Hidden Channels). Counting a show again, and the date it was left out, use that
  wording on web and mobile. The agreement and terms use the same name. Hiding a channel still
  leaves it off Browse and Recommendations, and listening to it still updates the Taste Profile.
- Who notices: signed-in listeners in Settings on Recommendations, and anyone reading how Taste
  Profile works
- Operator steps: none
