# abctestall deferred

Unclear failures from the full-repo sweep. Each entry is still open for the operator.

## Web: Space shortcut loses playback across sidebar navigation

- Command: `make e2e_test_web_report_spec SPEC=e2e/media-player-space-shortcut.spec.ts`
- Full report (`make e2e_test_report`): `Pressing Space toggles play and pause after clicking empty main content on /podcasts` failed at `expectPersistentPlayerPlaying(page, true)` on line 136, after `navigateToPodcastsViaSidebar` and before Space.
- Focused rerun: that test passed. The next test, `Pressing Space does not toggle play when a sidebar Podcasts link is focused`, failed at the same helper on line 173, again after `navigateToPodcastsViaSidebar` and before Space.
- Assertion: `aside#media-player button[data-media-player-playing="true"]` was not visible. The failure snapshot shows the correct episode (`E2E Podcast No Stored Position`) with the Play button and clock `0:00` / `1:00`. `loadPlayingNonLiveEpisode` had already waited until `currentTime >= 2`.
- What was tried: read `AppChrome` (the player sits outside the route `children`, and there is no `usePathname` pause) and `mediaPlayerWindowKeyDown.ts`. No edit. The two tests disagree across runs, so this is not a single broken Space handler.
- Competing explanations: sidebar navigation sometimes reloads the player and queue hydration comes back paused at 0; or the click that expands the Podcasts accordion sometimes pauses and seeks to 0. A client-side transition that keeps the same audio element would leave `currentTime >= 2` and `data-media-player-playing="true"`.
- Operator decision: should a sidebar navigation to `/podcasts` keep the already-playing episode in the playing state? If yes, find what resets the element. If a reload-on-navigation is acceptable, the two tests need a different setup than "navigate, then expect still playing."

## Web: protected add-by-RSS media loaded the seeded resume episode

- Command: `make e2e_test_web_report_spec SPEC=e2e/add-by-rss-credentials-add.spec.ts,e2e/add-by-rss-credentials-media-message.spec.ts`
- Full report: `playing protected media loads the plain URL and explains the failure` failed. `audio` src was `http://localhost:2111/e2e/audio/e2e-podcast-resume-60s-440hz.mp3` for the whole 15s poll (it was null for the first few checks). Expected `http://localhost:2111/basic-auth/audio/audio-001.mp3`. The player chrome was `E2E Podcast Resume P > 0` at `0:05`, which is the seeded queue row's stored position, not the protected add-by-RSS item the test posted to `e2ePodQueue01` now-playing.
- Focused reruns after the other player edits: the spec passed alone, and it passed again immediately after `add-by-rss-credentials-add.spec.ts`. No edit was aimed at this spec.
- What was tried: confirmed `addItemAddByRSSToNowPlaying` writes `list_position` 0, that add-by-RSS rows survive `applyResolvesToActiveItemOrAddByRss`, and that `loadAddByRSSIndexItemFromResourceData` can rebuild the item from the bundle. That path should request the basic-auth URL. It did not, in the full report.
- Competing explanations: queue hydration promoted the seeded upcoming resume row instead of the add-by-RSS now-playing row; or a handoff kept a previously loaded episode. The later passes mean this is intermittent, or it depended on suite order that the focused reruns did not recreate.
- Operator decision: reproduce against the full web Playwright order (the failure was test 5 of 169, after the credentials-add spec). If the resume episode wins again, trace which queue resource is `activeQueueUpcomingResources[0]` on `/`.

## iOS: notifications inbox cannot return to More after login

- Command: `npm run mobile:e2e:test -- --platform ios notifications-inbox`
- Assertion: after the guest inbox and `shared/login-seeded-user.yaml`, `tapOn id: tab-more` completes and `more-nav-notifications` is not found (step 30). The screen stays `notifications-inbox-screen` with the caught-up empty copy. The guest path before login does open `more-nav-notifications`.
- What was tried: while Notifications is an overflow tab, `OrderedTabBar` points the bar's focused index at Home, so Home is marked selected. Keeping the overflow route in that list (hidden, no width) stopped Home from being marked selected. The More control's accessibility label became "6 of 6", and the tap still left the inbox up. That edit was reverted.
- Competing explanations: the More press runs and `navigate('More')` does not change the focused tab from this overflow screen; or Maestro's tap on `tab-more` does not reach the pressable.
- Operator decision: on the authenticated inbox opened from More, press the visible More tab with a finger. If that returns to the More list, the Maestro tap is missing the control. If it stays on the inbox, the tab press is a no-op in this state.
