## Tab rows scroll by dragging, without a scrollbar

- Surfaces: web, management-web
- Change: Settings, profile, and management tab rows hide the horizontal scrollbar and scroll with a
  click-and-drag, the same way chip rows do. Both use `HorizontalDragScroller`.
- Who notices: anyone whose window is too narrow for the full tab row

## Alpha test push

- Surfaces: workers, k8s ops, alpha workers env
- Change: `notificationsTestPush` lists an account's registered devices or sends a visible test
  push and prints each provider result. It refuses unless `NOTIFICATIONS_TEST_PUSH_ENABLED` is
  `true`. Alpha workers env sets that flag. Operators start a Job with
  `npm run notifications:test-push:k8s`.
- Who notices: operators debugging push delivery on alpha
- Operator steps: publish a workers image that contains the command, pin the alpha ops app to a
  ref that includes the `ops-notifications-test-push` CronJob, sync the workers ConfigMap, then
  run the script

## Livestreams that leave a feed are stored as ended

- Surfaces: workers (RSS parser), api (item and livestream reads)
- Change: when a feed drops a `podcast:liveItem`, including its last one, the parser stores that
  live item as ended instead of leaving it live. A live item republished as a regular item with
  the same guid is marked ended and is no longer archived and reactivated on every parse.
- Who notices: listeners whose player restored a stream that had already finished; livestream
  pages and lists for feeds that remove live items after the stream
- Operator steps: none

## Web: Play works again after coming back to a signed-in session

- Surfaces: web
- Change: a signed-in tab no longer treats itself as a remote view of its own login session when no tab of the browser is playing. A new tab asks the browser's other tabs who holds audio. With no answer within one second, or once the playing tab closes or goes silent, it plays locally: it loads the queue head paused, and a Play loads and plays here, taking the active slot. Before, after a reload or closed tab, the player showed "Playing in Another Tab", and every Play or Pause was sent as a command no tab could take, for up to an hour. It was first seen after a livestream.
- Who notices: signed-in members on web with cross-device playback, after reloading or reopening the site
- Operator steps: none

## The player no longer shows the last episode's duration

- Surfaces: web
- Change: Every load into the web player now sets the duration right away from the item (or
  clears it), instead of waiting for the media to load. A livestream always has no numeric
  duration, so starting one after an episode no longer leaves the episode's length on screen.
  Add by RSS livestreams no longer take the enclosure's byte length as a duration, and never
  resume from a stored position. The hidden episode player no longer loads a database livestream's
  URL.
- Who notices: web listeners who switch from an episode to a livestream, or between episodes
- Operator steps: none

## Mobile player never shows the previous item's duration

- Surfaces: mobile
- Change: Loading a new item always replaces the full player's duration and position, including
  when the load fails (the error state now shows the new item at its own start, and Retry starts
  there instead of at the previous item's position). A livestream never takes a duration, even
  when the platform player reports its seekable window as one.
- Who notices: listeners who switch from an episode to a livestream or hit a load error on mobile
- Operator steps: none

## Live streams on iOS rewind, jump to live, and reconnect

- Surfaces: mobile (iOS)
- Change: the media engine reports a live stream's seekable window and live edge, keeps seeks
  inside the window, and adds a go-to-live command. Pressing play after pausing a live stream
  resumes where it paused when the stream still holds that moment with at least 6 seconds to
  spare before the window start, otherwise jumps to live (the same rule as web); a
  progressive stream reconnects so it plays what is live now. The lock screen hides the skip
  buttons for a live stream that cannot rewind.
- Who notices: iOS listeners of livestreams, from the app, lock screen, headset, and CarPlay
- Operator steps: native rebuild of the iOS app

## Live streams on Android rewind, jump to live, and reconnect

- Surfaces: mobile (Android)
- Change: the media engine reports a live stream's seekable window and live edge instead of
  reporting an HLS window length as the duration, keeps seeks inside the window, and adds a
  go-to-live command. Pressing play after pausing a live stream (app, notification, headset, or
  Android Auto) resumes where it paused when the stream still holds that moment with at least 6
  seconds to spare before the window start, otherwise jumps to live (the same rule as web); a
  progressive stream reconnects so it plays what is live now. Falling behind a live
  window recovers at live instead of failing.
- Who notices: Android listeners of livestreams
- Operator steps: native rebuild of the Android app

## Web: a saved livestream that has ended no longer reloads for signed-out visitors

- Surfaces: web
- Change: on page load, a signed-out visitor's saved now-playing item is read fresh from the server. When it is a livestream whose status is ended, or the item no longer exists, the saved snapshot is cleared and the player stays empty. A livestream that is still live or scheduled restores paused as a livestream, without the saved position or duration of an episode. Before, an ended livestream reloaded into the player, and a live one loaded through the episode path with the last saved duration. The saved snapshot now also keeps a copy of the item and its podcast, so when the server cannot be reached the player restores that copy, paused at the saved position, as it did before. A snapshot saved by an earlier version has no copy, so with no server answer nothing restores and the snapshot is kept for the next load.
- Who notices: signed-out web listeners who were on a livestream when they left
- Operator steps: none; the E2E seed adds an ended live item `e2eLiveEnded01`

## Livestreams resume or rejoin live after a pause

- Surfaces: web
- Change: Pressing Play on a paused livestream now resumes where it was paused when the stream
  (HLS) still holds that moment, and jumps to the live moment when it no longer does. A
  progressive livestream (a plain audio or video stream with no seekable window) reconnects and
  plays from the live moment, since it cannot hold anything from before the pause. Applies to
  livestreams from the catalog and from Add by RSS.
- Who notices: web listeners who pause a livestream and play it again
- Operator steps: none

## Mobile no longer restores a livestream that has ended

- Surfaces: mobile
- Change: on launch, before the app reloads the last item paused, it asks the server for the
  current status of anything that might be a livestream: a saved livestream, every signed-in queue
  head that is an episode, and the other device's item in the Switch prompt. A livestream that has
  ended, or any of those reads that answers 404, is not loaded. For signed-in users it moves to
  History as finished, and the next queue item loads paused; if nothing is next, the player stays
  empty. Signed-out users get an empty player. A saved item the device has no copy of, when the
  server answers 404, is dropped the same way. The Switch prompt is not shown when that other item
  has ended or the server answers 404. Offline or on a server error, restore behaves as before. A
  livestream that is still live or scheduled restores as before. Livestreams are now saved for
  restore on mobile, where before the previous episode was restored instead.
- Who notices: listeners who left a livestream in the player and reopen the app after it ended
- Operator steps: none

## Livestreams show Live, behind-live time, and rewind only when the stream allows it

- Surfaces: web, i18n (consumer catalog: `media_player.go_to_live`, `media_player.behind_live`)
- Change: While a livestream plays, the player's duration slot is a Live control instead of a
  number. Pressing it jumps to the current live moment and plays. The time on the left is empty at
  the live moment and shows how far behind live you are (for example −0:42) after rewinding. The
  scrubber and the skip-back / skip-forward buttons (and the arrow keys) only appear for streams
  that report a rewindable window of at least 30 seconds (HLS); plain progressive streams are
  live-only and show just the Live control. Screen readers hear "Go to Live" and "0:42 Behind
  Live".
- Who notices: every web listener of a livestream
- Operator steps: none

## Mobile livestream skips stay inside what the stream holds

- Surfaces: mobile
- Change: On a livestream whose stream keeps a rewindable window (HLS), skip back and skip forward
  move within that window and never past the live moment. On a livestream with no window
  (progressive audio), skips do nothing. Add by RSS livestreams follow the same rule; before, their
  skips used the bounds meant for episodes.
- Who notices: mobile listeners of livestreams
- Operator steps: none

## Web: ended livestreams no longer reload from a signed-in queue

- Surfaces: web
- Change: when a signed-in tab loads the head of the account queue and that item is a livestream whose status is now ended, the tab no longer loads it. It moves the row to history as a completed item, reloads the queue, and loads the next queue item paused; with nothing else queued, the player stays empty. This also covers a livestream another device left in now-playing. Only a tab that is not showing another device's playback writes that history row, and it waits for its first cross-device check-in to do so; a tab viewing another device's playback leaves the row to that device. The "switch to the other item?" prompt is no longer shown for an ended livestream. A head livestream that is still live or scheduled now loads as a livestream (starting at the live point) instead of through the episode path with a saved position. Status is read fresh from the server on each load; when the server cannot be reached, the queue's own copy of the item loads paused at its saved position instead of nothing.
- Who notices: signed-in web listeners who left a livestream in their queue and came back after it ended
- Operator steps: none

## Mobile full player shows Live, the time behind live, and a rewind scrubber for livestreams

- Surfaces: mobile
- Change: A livestream playing on the phone shows a Live control where an episode shows its
  duration. It is red at the live moment; pressing it goes to the live moment and plays. When
  behind live, the left-hand time reads like −0:42. When the stream keeps a rewindable window
  (HLS, 30 seconds or more), the scrubber spans that window and the skip buttons appear; without
  one (progressive audio, or a very short window), the band shows only the Live control and the
  skip buttons are hidden. The mini player is unchanged.
- Who notices: mobile listeners of livestreams
- Operator steps: none
