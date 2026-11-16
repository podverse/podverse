**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Clear the phone when the API address changes

## Rows

R1, R2, R3, R4, R5, R6, R7

## Runs after

none

## Files

- apps/mobile/src/config/customApiClearLists.ts
- apps/mobile/src/config/customApiClearLists.test.ts
- apps/mobile/src/config/customApiUrl.ts
- apps/mobile/src/config/customApiUrl.test.ts
- apps/mobile/src/data/customApiLocalClearPlan.ts
- apps/mobile/src/data/customApiLocalClearPlan.test.ts
- apps/mobile/src/data/clearLocalLibraryForApiSwitch.ts
- apps/mobile/src/playback/PlaybackProvider.tsx
- apps/mobile/src/screens/more/MoreCustomApiClearScreen.tsx
- apps/mobile/src/screens/more/MoreCustomApiScreen.tsx
- apps/mobile/src/navigation/index.tsx
- apps/mobile/src/lib/sectionChromeFlags.ts
- apps/mobile/vitest.config.ts
- packages/i18n-catalog/mobile/originals/en-US.json
- packages/i18n-catalog/mobile/originals/es.json
- packages/i18n-catalog/mobile/originals/fr.json
- packages/i18n-catalog/mobile/originals/el-GR.json
- release-notes/scratchpad.md

## Tests

- `apps/mobile/src/config/customApiClearLists.test.ts` — the removed rows and the kept rows are the lists in this plan, in this order.
- `apps/mobile/src/config/customApiUrl.test.ts` — `customApiCommitOpensClearScreen` is true only for `clear` and `probe`.
- `apps/mobile/src/data/customApiLocalClearPlan.test.ts` — table names cover every Drizzle table exported from `schema.ts`; AsyncStorage key selection; credential rows split by `signed-out-device`.
- `apps/mobile/vitest.config.ts` `include` — add the two new test files beside `src/config/customApiUrl.test.ts`. `schema.ts` imports only `drizzle-orm`. The IO module stays out of `include`.
- `apps/mobile/e2e/custom-api.yaml` — do not change it. That flow never switches origin.

## Release scratchpad

```markdown
## Custom API switch erases this phone's copy of the previous server

- Surfaces: mobile
- Change: Saving a different custom API address opens a screen that lists the local library, login, and push registration that will be erased. Accepting removes them. Cancel leaves the address and the library. An account on the previous server is left as it is. Theme, language, download limits, and feed-host passwords stay.
- Who notices: people who point the app at another server
- Operator steps: none
```

Append that block at the end of `release-notes/scratchpad.md`. Do not edit other entries.

## Locked decisions

- Erase the phone's copy. Do not namespace a database per address, and do not prefix stored ids with the server URL.
- Do not make Podcast Index the id the app stores.
- The confirm step is a stack screen, not `ConfirmDialog`. The existing logout dialog stays, and it still runs first when the phone is signed in.
- The health probe runs before the screen, and only for a new custom address. A failed probe writes nothing and opens nothing.
- Returning to the built-in address is the same erase when an override is already saved. Reset with no override still only clears the field.
- The screen lists every category below, including ones this phone does not currently hold.
- The clear screen is not a deep link. Do not add it to `moreTabLinkScreens`.
- During the erase, do not call refresh, revoke, device unregister, or any account route.
- Keep feed-host usernames and passwords for `SIGNED_OUT_CREDENTIAL_OWNER` (`signed-out-device`). Keep a UnifiedPush endpoint and distributor auth key the user typed (`push.up.userEndpoint`, `push.up.userAuthKey`, `push.up.mode`). Keep `push.installationId`. Keep artwork cached by image URL.
- Write `api.custom_base_url` only after the erase finishes. A thrown erase leaves the old address.

## When the screen opens

In `customApiUrl.ts`, add `customApiCommitOpensClearScreen`. It is true for `action: 'clear'` and `action: 'probe'`, and false for `unchanged` and `invalid`.

`MoreCustomApiScreen` `commit` and `handleReset`:

1. `unchanged`, or Reset while `readCustomApiBaseUrlOverride()` is null: keep today's behavior. No screen.
2. `status !== 'anonymous'`: keep today's logout dialog and return. Logout does not erase the library and does not change the address.
3. `probe`: call `probeCustomApiBaseUrl` first. On failure, set the existing feedback and return.
4. Otherwise navigate to `MoreCustomApiClear` with `{ baseUrl: string | null }`. `null` means restore the built-in address. Do not call `writeCustomApiBaseUrl` here.

Update `custom_api.intro` so Save is described as checking status 200 and then opening the screen that lists what this phone will erase, and Reset does the same when an address is already saved. Keep the sentence that the phone must be logged out so the login is not sent to another server.

## Confirmation screen

New `MoreCustomApiClearScreen` on the More stack.

In `apps/mobile/src/navigation/index.tsx`, anchor on `MORE_STACK_ROUTES.MoreCustomApi`, `MoreStackParamList.MoreCustomApi`, and the `MoreStack.Screen` for `MoreCustomApi`:

- `MORE_STACK_ROUTES.MoreCustomApiClear = 'MoreCustomApiClear'`
- `MoreStackParamList.MoreCustomApiClear = { baseUrl: string | null }`
- Register the screen immediately after `MoreCustomApi`, title `t('custom_api.clear.title')`.
- Do not add a linking path.

The screen reads the lists from `customApiClearLists.ts` and does not hardcode a second copy. `MobileScreenContainer` with `scrollEnabled` and `testID="custom-api-clear-screen"`. A column, not an overlay. Intro sentence, then the heading **Will Be Erased** and every removed row, then **Stays on This Phone** and every kept row. Rows are not buttons and have no chevron. Each row is a title and the sentence under it.

`FormActions`: Cancel first (`misc.cancel`, `custom-api-clear-cancel`, secondary, `goBack`). **Clear and Switch** second (`custom_api.clear.confirm`, `custom-api-clear-confirm`, `variant: 'danger'`). Disable both while the erase is running. The confirm button shows its loading state inside its resting label.

If `baseUrl` is missing because the route was opened without params, `goBack` and render nothing else.

On confirm, run the order in the next section. On success, `goBack` to Custom API. That screen already shows which address is active. On failure, stay on this screen, leave the address unchanged, and show `custom_api.clear.failed` ("Could not erase this phone's data. The API address was not changed.").

After success, `navigation.goBack()` so More shows MoreCustomApi. Do not reset the More stack, and do not reset the root navigator.

Then take the tab navigator with `navigation.getParent()`. For each tab route other than `More`, when its nested `state.index` is greater than 0, dispatch `CommonActions.reset` with `target` set to that nested `key`, `index: 0`, and one route copied from `nested.routes[0]` (`name` and `params` only). Do the same for a More-stack route named `MoreOverflowHome`, `MoreOverflowBrowse`, `MoreOverflowRecommendations`, or `MoreOverflowLibrary` when that route's own nested `state.index` is greater than 0. Those overflow stacks' first routes are `HOME_STACK_ROUTES.HomeRoot`, `BROWSE_STACK_ROUTES.BrowseRoot`, `BROWSE_STACK_ROUTES.BrowseRoot`, and `LIBRARY_STACK_ROUTES.LibraryHub`. Copy `nested.routes[0]` rather than building a new params object.

## Erase order

`clearLocalLibraryForApiSwitch` in `apps/mobile/src/data/clearLocalLibraryForApiSwitch.ts`. Do not import `PlaybackProvider.tsx` into that module.

The screen stops playback before calling it. `clearNowPlaying` in `PlaybackProvider.tsx` (the `useCallback` near the pause path) already pauses the bridge, drops the current item, and clears the last-playback snapshot. It is not on the context. Add `clearNowPlaying: () => void` to `PlaybackContextValue` and to the `sessionValue` object in the `useMemo` beside `pause: routedPause`. The screen calls `usePlaybackSession().clearNowPlaying()`. Do not add a second pause function.

The function then does this, and stops on the first failure before `writeCustomApiBaseUrl`. After step 12 succeeds, call `writeCustomApiBaseUrl(baseUrl)`. `null` restores the built-in address.

1. `syncQueue.reset()` (`apps/mobile/src/sync/syncQueue.ts`) so a running job cannot write the old rows back or send them to the new host.
2. `advanceAuthSessionGeneration()`, then `clearAllSecureTokens()`. No revoke and no refresh.
3. `downloadManager.removeAll()` (`apps/mobile/src/downloads/downloadManager.ts`). That cancels in-flight transfers, deletes each download file, and clears the download rows. Then delete `FileSystem.documentDirectory + DOWNLOADS_SUBDIRECTORY` (`downloads` in `downloadStorage.ts`) if the directory is still there, so an orphan file does not remain.
4. `addByRssCredentialStore.clearAccountCredentials()` while the credential index still lists account owners. Do not delete secrets whose owner is `signed-out-device`.
5. Read the `signed-out-device` credential index rows.
6. Delete every row in every `sqliteTable` const exported from `schema.ts`, including `kv_meta`. Skip the `Row` and `Insert` types. Keep the schema and `user_version`. Derive names with `getTableName` from `drizzle-orm` inside `customApiLocalClearPlan.ts` so a new table is included without a hand list.
7. Insert the saved `signed-out-device` credential index rows again. Their SecureStore values were not deleted.
8. Clear the native playback journal with `nativePlaybackBridge.writePlaybackJournal('[]')` and remove `pv_mobile_playback_journal_cursor`. Remove `pv_mobile_last_playback` if step 9 did not.
9. Delete these AsyncStorage keys, by exact name or prefix, using the pure selector:
   - prefix `sort.channel:`
   - prefix `sort.item:`
   - prefix `sort.playlist:`
   - prefix `notifications.subscribe_push_prompt_answered:`
   - prefix `notifications.sign_in_push_prompt_shown:`
   - `membership.expiry_dismissed_for`
   - `playback.handoff_dismissed_state`
   - `auth.forced_logout_at`
   - `auth.forced_logout_notice`
   - `autoDownload.registrationHash`
   - `pv_mobile_last_playback`
   - `pv_mobile_playback_journal_cursor`
10. Delete SecureStore `push.fcm.registeredToken` and `push.up.registeredEndpoint` with `deleteItemAsync` only. Do not call the API. Do not delete `push.up.userEndpoint`, `push.up.userAuthKey`, `push.up.mode`, or `push.installationId`.
11. Drop in-memory account state the same way `SyncProvider` does when status becomes anonymous: `resetNotificationStreamStore`, `resetCrossDevicePlaybackStore`, `resetNotificationsInboxCache`, `clearBannerNotificationQueue` from `bannerNotificationStore.ts`, `clearAccountPushPreferences`, `nowPlayingAddByRssSections.reset()`, `publishPlaybackReconcileConflicts([])`, and `publishPlaybackPositionAdoptions([])`. Banner kind switches stay.
12. `hydrateChannelActionChrome({ subscribedIdTexts: [] })`, `downloadStore.hydrate([])`, and clear the section-chrome memory map (add a production clear next to `resetSectionChromeFlagsMemoryForTests` in `sectionChromeFlags.ts`; the test helper may call it). Then `reprojectCarCacheAll()` so the car cache is read from the empty tables. Do not reproject before step 6.

Step 6 also removes the playback clock offset, sync watermarks, the sign-up merge email, home clip and livestream caches, identity-remap state, channel-action chrome, v4 carryover, the error log, and the native advance source. Those are inside the rows below. They do not get their own screen row.

Do not remove `uit`, `locale`, `tabs.visible`, `offline.mode`, download-limit keys, `aqc.rd`, `aqc.rp`, `preferred_media_type`, `pmt`, `clip.visibility`, `clip.has_seen_make_clip_how_to`, `notifications.banner_kinds`, list-level `sort.*` keys that do not start with `sort.channel:`, `sort.item:`, or `sort.playlist:`, or `api.custom_base_url`.

The pure selector and the credential split live in `customApiLocalClearPlan.ts` with no Expo import. The test feeds a fake key list and fake credential rows.

## Screen copy

Add keys under `custom_api` in all four mobile originals: `en-US`, `es`, `fr`, `el-GR`. Do not edit `overrides/` or `compiled/`. English titles are title case. English sentences are sentence case. The other locales are real translations in that language's own capitalization. `customApiClearLists.ts` exports the removed keys and the kept keys in the order below. The test asserts that order.

Intro `custom_api.clear.intro`: This phone's copy of the previous server will be erased. An account on that server is left as it is.

`custom_api.clear.removed_heading`: Will Be Erased

`custom_api.clear.kept_heading`: Stays on This Phone

`custom_api.clear.confirm`: Clear and Switch

`custom_api.clear.failed`: Could not erase this phone's data. The API address was not changed.

`custom_api.clear.title`: Clear Local Data

Removed rows, title then sentence:

- Subscriptions — Shows you follow on this phone, stored under the previous server's ids.
- Saved Episodes — Episode lists saved for those shows.
- Downloads — Downloaded episodes and their files on this phone.
- Add by RSS Feeds — Feeds saved on this phone, including ones parsed here.
- Queue, History, and Playlists — Queue, history, and playlists saved on this phone.
- Listening Position — Where playback stopped, the last thing playing, and listening reports that have not been sent.
- Seen Marks and Section Chips — Per-show seen marks, live badges, and which sections a show has.
- Per-Show Auto-Download — Which shows download new episodes on this phone.
- Sort Choices for One Show — Sort and filter choices saved for a specific show, episode, or playlist.
- Previous App Carryover — Podcasts carried over from the previous app that are still waiting on this phone.
- Saved Login — The access token and refresh token for the previous server.
- Push Registration — This phone's registration with the previous server's push.
- Error Log — The on-device error log, which names the previous server's ids.
- Notification Prompts — Notification prompts already answered for the previous account.
- Membership Reminder and Handoff — A dismissed membership reminder, and a declined playback handoff for an episode from the previous server.

Kept rows, title then sentence:

- Theme, Language, and Tab Bar — Theme, language, and which tabs are on the bar.
- Offline Mode — The Offline Mode switch.
- Download Limits — Download size limits and defaults that are not tied to one show.
- Shuffle, Repeat, and Media Type — Shuffle, repeat, and which media type opens first.
- Notification Banners — Which notification banners to show.
- Add by RSS Passwords — Usernames and passwords for a feed host.
- UnifiedPush and This Install — A UnifiedPush address or distributor auth key you typed, and this install's id.
- API Address — The API address you are saving.

## Close

After the scratchpad entry, move `.llm/plans/active/custom-api-clear-on-switch/` to `.llm/plans/completed/custom-api-clear-on-switch/`. Do not commit.

End the final message with the operator commands. Do not run them.

**Mobile** tab, one-shot:

```bash
npm run i18n:validate
npm --prefix apps/mobile run test
```

**Mobile Maestro**, after **Mobile E2E Metro** is already running. This flow checks the bad-address path only. The clear screen needs a second origin, which that flow does not have.

```bash
npm run mobile:e2e:test -- custom-api
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
