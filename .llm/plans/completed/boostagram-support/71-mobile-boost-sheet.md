**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R1, R7, R26, R28, R29, R30, R43

## Runs after

10, 11, 32, 50, 70

## Files

- apps/mobile/src/components/boost/BoostSheet.tsx
- apps/mobile/src/components/boost/useBoostSheetSend.ts
- apps/mobile/src/prefs/prefsStore.ts
- apps/mobile/src/prefs/prefsStore.test.ts
- apps/mobile/e2e/boost-send.yaml
- scripts/mobile/e2e-test.sh

Plan 50 has already replaced `BoostSheetTarget` and left submit on the not-available dialog. Edit the sheet as it stands after that plan. `BoostSheet.tsx` is the view. `useBoostSheetSend.ts` is the send hook. Do not edit `useBoostSheet.tsx` or `boostFormModel.ts`.

## Tests

No new unit file for the sheet. Plan 70 covers the recipient math, the Alby adapter, the rate-limit branch, the post branch, and the forwarded message and sender name. Update `apps/mobile/src/prefs/prefsStore.test.ts`: the hydrate expectation includes `'boost.sender_name': null`, and one test writes `Ada` and then `''` through `setPref` and reads each back with `getPref`. That test is the remembered-name check. This plan adds one Maestro flow, `apps/mobile/e2e/boost-send.yaml`, shared by both platforms. Add `boost-send` to `flow_needs_e2e_api` in `scripts/mobile/e2e-test.sh` beside `v4v`. Keep `boost-messages` and `boost-entry` if they are already on that line. The control is not platform-specific, and the flow does not open the system browser. The flow checks the signed-out lock. It does not type a name. No API integration test. The mint route and its response stay as they are.

## Release scratchpad

Append this when the prompt runs alone. When it runs in a phase with other prompts, put the same entry in the final message under "Release notes entry" and do not edit `release-notes/scratchpad.md`.

```markdown
## Mobile boost sheet sends through Alby

- Surfaces: mobile
- Change: The boost sheet sends a manual Lightning boostagram through the listener's Alby account. A signed-out listener can pay. The name and message stay locked until Podverse login. The sheet does not fill the name from the account display name. A typed name is remembered on the device and filled in next time until they edit it, and an empty name is sent as no name. After the largest split succeeds, one mbrss-v1 boost is posted when the channel uses that standard and the signed-in account has a MetaBoost sender id. The phone does not post mb-v1. PayPal, Patreon, and Buy Me a Coffee tabs still say sending is not available yet.
- Who notices: listeners on iOS and Android who open Boost on a channel that has Lightning value tags
- Operator steps: the build needs `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID` for Connect to appear. There is no client secret.
```

# Wire the boost sheet to Alby

Anyone can pay. Podverse login is not required for the Lightning payment. The name and message stay locked until the account snapshot is loaded. The payment goes through `runMobileManualBoost` from plan 70 and `createAlbyBoostPaymentProvider`. The sheet reads `BoostSheetTarget` from plan 50 and does not fetch the channel or the item again. Directory ids and Add by RSS local ids stay on the target. Send from `channel.channel_values` and `item.item_values` on that object.

Rewrite the doc comment on `BoostSheet`. Lightning submit pays through the connected value provider. Other value tabs tell the listener that sending is not available yet.

No new catalog keys. Every sentence below is an existing key. Import `t` from `useTranslation` in the sheet. The hook returns kinds, not English.

## What the hook owns

`useBoostSheetSend(target: BoostSheetTarget | null)` in `useBoostSheetSend.ts`. Named export. It uses `useAuth` from `../../auth`. It reads `account`, `accessToken`, `refreshToken`, `clearSession`, and `setTokens`.

The hook does not call `t()`. Returned fields:

- `amount`, `setAmount`, `amountInvalid` (`boolean`)
- `senderName`, `setSenderName`
- `message`, `setMessage`, `messageMaxLength` (`number | undefined`), `messageEditable` (`boolean`)
- `albyPhase`: `'loading' | 'not_configured' | 'disconnected' | 'connected'`
- `connect`, `connectBusy`, `connectFailed` (`boolean`)
- `submit(valueKey: string)`, `submitBusy`
- `notice`, `dismissNotice`
- `statuses` for the lightning rows
- `showBack`, `goBack`
- `capabilityStatus`: `'idle' | 'loading' | 'unavailable' | 'sender_blocked' | 'ready'`
- `senderBlockMessage` (`string | null`)
- `termsUrl` (`string | null`)
- `hasMetaBoost` (`boolean`)

`notice` is null or `{ kind: 'offline' }`, `{ kind: 'rate_limited'; retryAfterMs: number }`, `{ kind: 'rate_limit_unavailable' }`, `{ kind: 'session_ended' }`, `{ kind: 'metaboost_offline' }`, `{ kind: 'sender_blocked'; detail: string | null }`, `{ kind: 'owner_terms'; detail: string | null }`, or `{ kind: 'post_failed'; detail: string | null }`. The sheet maps that union in one exhaustive switch.

## Name and sender id

Do not read `account_profile.display_name`. Do not call `resolveBoostSenderName`. Plan 11 does not export it.

`isLoggedIn` is `account !== null`. While the account snapshot is still null, stay on the signed-out path: the name and message stay locked, the capability request does not run, and `boostFieldsForPayment` empties the payment strings. `senderGuid` is `account.sender_guid` when that value is a string and its trim is non-empty, otherwise null. The mbrss-v1 post is skipped without a guid. The payment still runs.

The hook imports `boostFieldsForPayment` from `@podverse/v4v-helpers`, and `getPref` and `setPref` from `../../prefs`. The view imports `showBoostNameAndMessageFields` from `@podverse/v4v-helpers`. Plan 70 has already added that package. The view does not call `setPref`.

The remembered name is one device pref, `boost.sender_name`, in `apps/mobile/src/prefs/prefsStore.ts`. The sheet has one name field, so one string covers every value tab. Web keeps a name per value tab in the boost form defaults. That per-tab store is the existing web cookie. The phone does not copy it.

Add `'boost.sender_name'` after `'playback.handoff_dismissed_state'` in `PrefKey`, `PrefValueMap` (type `string`), `PREF_KEYS`, and `createEmptySnapshot` (`null`). Add a `getPref` overload and a `setPref` overload for that key. In `getPref`, include the key in the branch that returns the stored string unchanged, beside `playback.handoff_dismissed_state`. A missing key returns null. An empty stored string returns `''`. `setPref` already writes every string, including `''`. In `hydratePrefs`, read it in its own branch before the final assignment that writes `snapshot.uit`. A key that falls through that assignment overwrites `uit`.

Doc comment on the value: the boost sheet sender name typed on this phone. Empty when they cleared the field. Absent until they type one. Kept across Podverse sign-out.

Do not clear this key in `clearSession`. It is device data. A signed-out visit shows the same name in the locked field. The payment does not send it.

On `channel.id_text` or `item?.id_text` change, including when the sheet closes and those become empty:

- Increment a generation ref.
- Reset the amount to `1`, the message to `''`, `amountInvalid` to false, `connectFailed` to false, statuses to empty, the notice to null, `showBack` to false, and both busy flags to false.
- Set a `nameEdited` ref to false, and `setSenderName('')`.
- Read `getPref('boost.sender_name')`. If the generation changed or `nameEdited` is true, ignore the result. Otherwise `setSenderName` to that string, or `''` when the result is null. A rejection leaves the name `''`.

The hook's `setSenderName` is what the name field passes to `onChangeText`. It sets `nameEdited` true, stores the next string, and calls `void setPref('boost.sender_name', next)`. A rejection leaves the field as typed and sets no notice. Do not write the pref from the load. Do not write the message to a pref. Clearing the field writes `''`, so the next open stays empty.

A sign-in while the sheet is open leaves the current name in place. It does not copy the display name. The field is what the listener sees. `submit` passes `boostFieldsForPayment(account !== null, senderName, message)` as the payment `senderName` and `message`. A signed-out payment sends `''` and `''`. A signed-in payment sends the field values, including blanks. Do not send the word `Anonymous`.

## Alby on the sheet

When `target` becomes non-null, call `loadAlbyConnection()` from `../../v4v/alby`. Ignore the result when a cleanup flipped a local flag. `albyPhase` stays `loading` until that call settles. Subscribe with `useSyncExternalStore(subscribeAlbyConnection, getAlbyAccountSnapshot)` so a connect updates the phase.

After the load:

- `isAlbyConfigured()` false: `not_configured`.
- `getValueProviderConnection('alby').status` is not `connected`: `disconnected`.
- Otherwise `connected`.

Do not read `EXPO_PUBLIC_MOBILE_V4V_ENABLED`. The boost button is already independent of that flag. Connect and send use the Alby client directly.

`connect` returns immediately when `connectBusy` is true, the phase is `loading`, or the phase is `not_configured`. When `isOfflineModeEnabled()` from `../../prefs/offlineMode` is true, set notice `offline` and return. Otherwise set `connectBusy`, set `connectFailed` false, and await `connectAlby()`. Ignore the result when the generation changed. `failed` sets `connectFailed` true. `cancelled` changes nothing. `not_configured` leaves the phase to show the not-configured sentence. `connected` leaves the snapshot subscription to flip the phase. Do not submit automatically. Do not call `navigateToAlbyProvider`. Do not close the full player. The sheet renders `t('v4v.alby.connect_failed')` when `connectFailed` is true.

## Capability

When `target` is non-null, `metaBoost` is `resolveMetaBoostFromApiValueMetadata(target.channel.channel_meta_boost)` from `@podverse/v4v-metaboost`. When that is null, skip the network and set `capabilityStatus` to `idle`. `messageMaxLength` comes from `mobileBoostMessageMaxLength(metaBoost !== null, capability)`. For that helper, treat `idle` as status `idle` with a null limit, `loading` as `loading`, `unavailable` as `error`, and `ready` or `sender_blocked` as `success` with the stored limit.

Fetch only when `metaBoost` is non-null, `account` is non-null, and `senderGuid` is non-null. A signed-out visit does not send the capability request. A signed-in visit with a blank sender id does not send it either. Do not call either fetch with a null or empty guid. When that condition is false, set `capabilityStatus` to `idle`, clear any stored limit, and do not start a request. A sign-out while the sheet is open takes this path, so a previous `ready` does not keep the post enabled.

When the condition is true, fetch on target identity change and when `senderGuid` changes. Cancel with the same generation flag. `standard === 'mb-v1'` or a node that contains `/standard/mb-v1/` calls `fetchMbV1BoostCapability`. Every other node calls `fetchMbrssV1BoostCapability`. Pass `{ senderGuid }` with that trimmed guid.

- `loading` until the fetch settles. `capabilityStatus` is `loading`.
- `success`: store `messageCharLimit` and `termsOfServiceUrl`. `termsUrl` is the terms URL when its trim is non-empty, otherwise null. When `senderBlocked` is true, `capabilityStatus` is `sender_blocked` and `senderBlockMessage` is the server string or null. Otherwise `capabilityStatus` is `ready` and `senderBlockMessage` is null.
- `error`: `capabilityStatus` is `unavailable`. `httpMessagingEnabled` stays false. The listener can still pay.

`httpMessagingEnabled` is true only when `capabilityStatus` is `ready`. Pass that into `runMobileManualBoost`. `sender_blocked` and `unavailable` both leave it false.

When `messageMaxLength` is a number, slice `message` to that length the way the web form does. Pass `maxLength` to the message `TextField` only when it is a number.

`messageEditable` is false when `account` is null, when `submitBusy` is true, or when `capabilityStatus` is `loading`, `unavailable`, or `sender_blocked`. The amount field is `editable` false only while `submitBusy`. A signed-out visitor, a blocked sender, a capability load, and a capability failure can still pay. The name and message fields do not accept edits while `messageEditable` is false, and the locked name field still shows the remembered name. The HTTP post runs only when `capabilityStatus` is `ready`. `hasMetaBoost` is `metaBoost !== null`.

The sheet translates `capabilityStatus`:

- `loading` → `value.boost_messages.mbrssV1_capability_loading_status`, testID `boost-sheet-capability-loading`
- `unavailable` → `value.boost_messages.mbrssV1_capability_unavailable`, testID `boost-sheet-capability-unavailable`
- `sender_blocked` → `senderBlockMessage` when its trim is non-empty, otherwise `value.boost_messages.sender_blocked_preflight_fallback`, testID `boost-sheet-sender-blocked`
- `idle` and `ready` render nothing

Those texts use `accessibilityLiveRegion="polite"`. Only one is visible.

When `termsUrl` is non-null, a `Pressable` testID `boost-sheet-terms`, `accessibilityRole="link"`, label `t('value.meta_boost.title')`, calls `Linking.openURL(termsUrl)`. Do not render `value.meta_boost.terms_message`. That string contains a rich-text tag. When the fetch succeeded and `termsUrl` is null, show `t('value.meta_boost.no_terms')` as text, testID `boost-sheet-terms-missing`.

## Lightning rows

The sheet still builds tabs with `buildBoostValueTabs`. That merge is display. For the active tab whose key is `lightning`, ignore `boostRecipientsForTab`. Map the target into blocks:

```typescript
{
  type: value.type,
  recipients: value.channel_value_recipients.map((recipient) => ({
    address: recipient.address,
    customKey: recipient.custom_key,
    customValue: recipient.custom_value,
    name: recipient.name,
    split: recipient.split,
    type: recipient.type,
  })),
}
```

Item rows use `item_value_recipients` and the same field copy. Pass `itemValues: null` when `target.item` is null. Pass `item.item_values ?? []` when the item exists.

`totalSats` is `parseBoostSatsAmount(amount) ?? 0`. `manualBoostRecipientsFromLightning(lightningRecipientsForBoost(...), totalSats)` is the list on screen and the list passed to submit. Each row's label is the trimmed name when that trim is non-empty, otherwise the address. The line is `` `${label} · ${normalizedSplit}% · ${finalAmountSats}` ``. testID `boost-sheet-recipient-${id}`.

A non-lightning tab keeps `boostRecipientsForTab` and the existing line. Submit on that tab opens the existing not-available dialog and does not call the runner.

## Submit

`submit(valueKey)` returns immediately when `submitBusy` is true.

- `valueKey !== 'lightning'`: show the existing `ConfirmDialog` (`boost-not-available`, body `features.search.not_available_yet`). Return.
- `isOfflineModeEnabled()`: notice `offline`. Return.
- `albyPhase !== 'connected'`: return. The button is already disabled.
- `parseBoostSatsAmount(amount)` is null: set `amountInvalid` true. Return.
- The lightning recipient list is empty: show the not-available dialog. Return.

Clear `amountInvalid`, the notice, and statuses. Set `submitBusy`. A new amount edit sets `amountInvalid` false. Capture the generation, `paymentFields = boostFieldsForPayment(account !== null, senderName, message)`, `senderGuid`, `metaBoost`, `httpMessagingEnabled`, `mobileBrandName()` from `../../lib/mobileBrandName`, and `Constants.expoConfig?.version` when that is a non-empty string (otherwise null). Feed fields come from the target: `channel.podcast_guid`, `channel.title`, `item?.guid`, `item?.title`. Pass `paymentFields.message` and `paymentFields.yourName` to `runMobileManualBoost` as `message` and `senderName`. A null account does not return early from `submit`.

Call `runMobileManualBoost` with `createAlbyBoostPaymentProvider()` and:

- `rateLimitStatus`: `requestWithMobileAuthRefresh` from `../../auth` with `{ accessToken, clearSession, refreshToken, setTokens }`, then `api.reqMetaboostMbrssV1MintRateLimitStatus()`. Return `{ allowed, retryAfterMs }`.
- `postBoost`: `postMbrssV1BoostAfterLargestSplit` with `largestSplitSucceeded: true`, the captured metaBoost, sender guid, `totalMsat` from the argument, `appName`, `appVersion` omitted when null, the captured feed and item fields, `message: paymentFields.message`, `yourName: paymentFields.yourName`, and `onMetaboostUnreachable`. The transport's `mintAppAssertion` calls `requestWithMobileAuthRefresh` and `api.reqMetaboostMbrssV1MintAppAssertion({ ingest_url: ingestUrl, body_json: bodyJson })`, then returns `{ authorization: mint.authorization, ingestUrl: mint.ingest_url }`. `postIngest` calls `request` from `@podverse/helpers-requests` with `method: 'POST'`, `data: bodyJson`, and headers `Authorization` and `Content-Type: application/json`. Return `res.data`. Do not send the Podverse access token to the MetaBoost host.
- `onRecipientEvent`: ignore it when the generation changed. `paying` sets that id to paying. `attempt_failed` appends `message` to that id's detail lines and leaves the status paying. `success` sets success. `failed` stores `mobileBoostFailureCopy(event.error)`. The first `session_ended` in the run sets notice `session_ended` once.
- `onMetaboostUnreachable`: set notice `metaboost_offline` and return a promise that resolves when `dismissNotice` runs. If the generation changed, resolve immediately.

When the generation changed after the await, do not apply the result. `finally` clears `submitBusy` only when the generation still matches. The reset effect already cleared it when the target changed.

On `rate_limited`, store `{ kind: 'rate_limited', retryAfterMs }`. On `rate_limit_check_failed`, store `{ kind: 'rate_limit_unavailable' }`.

On `sent`: if `postError` is non-null, store `mobileBoostPostNotice(postError)`. `capability_already_shown` leaves the `metaboost_offline` notice the callback already set. `sender_blocked`, `owner_terms`, and `post_failed` store that kind and its `detail`. Then, when every status is `failed`, set `showBack`. When any status is `success` and `postError` is null, `setMessage('')`. Do not close the sheet. Do not refresh the received-boostagram list.

`goBack` clears statuses, `showBack`, and the notice. It leaves the amount, name, and message.

## Sheet view

Keep the overlay, header, artwork, tabs, and amount field. `showNameAndMessage` calls `showBoostNameAndMessageFields`. `hasMetaBoost` comes from the hook. On the lightning tab, `hasLnaddressRecipient` is true when `lightningRecipientsForBoost` has a recipient whose `type` is `lnaddress`, and `hasNodeRecipient` when one has `type` `node`. On any other tab, those two flags use `recipientTypesForTab(activeTab)` the same way. When `showNameAndMessage` is false, omit the name and message fields and render `Text` testID `boost-sheet-message-notice` with `t('value.boost_messages.not_enabled')`. Do not add a control that opens a MetaBoost info screen. When it is true, render the name and message fields. The amount `TextField` uses `editable={!submitBusy}` and `invalid={amountInvalid}`. The name and message fields use `editable={messageEditable}`. The name field `placeholder` is `t('misc.anonymous')` and its `value` is `senderName`. An empty value leaves that placeholder visible. Do not put `Anonymous` in the value. `editable={false}` on the `TextInput` is the locked state Maestro reads as `enabled: false`. When `amountInvalid` is true, a `Text` testID `boost-sheet-amount-error`, `accessibilityLiveRegion="polite"`, shows `t('value.boost_messages.amount_input_invalid_number')`.

Under the message field, render the capability status and the terms control.

`albyPhase === 'not_configured'`: `Text` testID `boost-sheet-alby-not-configured` with `t('v4v.alby.not_configured')`. No Connect button.

`albyPhase === 'disconnected'`: a full-width `Button` `size="form"` label `t('v4v.alby.connect')`, testID `boost-sheet-connect`, `onPress` the hook's `connect`, `loading` when `connectBusy`. `connectFailed` shows `Text` testID `boost-sheet-alby-error`, `accessibilityLiveRegion="polite"`, `t('v4v.alby.connect_failed')`.

Lightning recipient rows include a status `Text` testID `boost-sheet-recipient-${id}-status`, `accessibilityLiveRegion="polite"`, when a status exists.

- paying: `value.boost_messages.status_paying`, then each attempt line
- success: `value.boost_messages.status_success`
- failed: `value.boost_messages.status_failed`, then each attempt line, then the extra sentence for `provider_message` (the message), `invoice_timeout` (`value.boost_messages.invoice_timeout`), `session_ended` (`v4v.alby.session_ended_body`), and `not_configured` (`v4v.alby.not_configured`). Kind `failed` has no extra sentence.

`FormActions` stays Cancel then Submit, in that order. Cancel calls `onClose`. Submit calls `submit(activeKey)`, label `t('misc.submit')`, testID `boost-sheet-submit`, `loading` when `submitBusy`. `disabled` when `submitBusy`, `albyPhase !== 'connected'`, or `parseBoostSatsAmount(amount)` is null. A null account does not disable Submit. A non-lightning tab does not disable Submit. That press opens the not-available dialog.

When `showBack` is true, replace Submit with Go Back, label `t('misc.go_back')`, testID `boost-sheet-back`, `onPress` `goBack`. Keep Cancel.

One notice `ConfirmDialog`, separate from `boost-not-available`. testID `boost-sheet-notice`, cancel testID `boost-sheet-notice-close`. `onCancel` is `dismissNotice`. No confirm button. Copy:

| Kind | Title | Body | Button |
| --- | --- | --- | --- |
| offline | `t('value.boost')` | `t('settings.offline_mode.unavailable')` | `t('misc.ok')` |
| rate_limited | `t('value.boost_messages.mint_rate_limit_modal_title')` | `retryAfterMs` at or under 90000 uses `t('value.boost_messages.mint_rate_limit_wait_seconds', { seconds: Math.ceil(retryAfterMs / 1000) })`. Above 90000 uses `t('value.boost_messages.mint_rate_limit_wait_minutes', { minutes: Math.max(1, Math.ceil(retryAfterMs / 60000)) })` | `t('misc.ok')` |
| rate_limit_unavailable | `t('value.boost_messages.mint_rate_limit_modal_title')` | `t('value.boost_messages.mint_rate_limit_preflight_error')` | `t('misc.ok')` |
| session_ended | `t('v4v.alby.session_ended_title')` | `t('v4v.alby.session_ended_body')` | `t('misc.ok')` |
| metaboost_offline | `t('value.boost_messages.mbrss_offline_modal_title')` | `t('value.boost_messages.mbrss_offline_modal_body')` | `t('value.boost_messages.mbrss_offline_continue')` |
| sender_blocked | `t('value.boost_messages.sender_blocked_modal_title')` | detail, or `t('value.boost_messages.sender_blocked_post_fallback')` | `t('value.boost_messages.sender_blocked_modal_primary')` |
| owner_terms | `t('value.boost_messages.owner_terms_not_accepted_modal_title')` | detail, or `t('value.boost_messages.owner_terms_not_accepted_post_fallback')` | `t('value.boost_messages.owner_terms_not_accepted_modal_primary')` |
| post_failed | `t('value.boost_messages.metaboost_post_failed_modal_title')` | detail, or `t('value.boost_messages.metaboost_post_failed_fallback')` | `t('value.boost_messages.metaboost_post_failed_modal_primary')` |

Add styles the way the sheet already builds them, in the existing `useMemo` factory. Status text uses `themeStyles.textSecondary`. The amount-error text uses `tokens.text.danger`. Do not introduce a hex color.

## Maestro

`apps/mobile/e2e/boost-send.yaml`. Timeouts come from `apps/mobile/e2e/shared/timeouts.env`. No numeric literals.

- `runFlow: shared/launch-and-connect.yaml`
- Search `podcast`, tap `search-result-row-0`, wait for `podcast-detail-screen` with `${TIMEOUT_SLOW}`
- Tap `podcast-episode-row-0`, wait for `episode-detail-screen` with `${TIMEOUT_SLOW}`
- `assertVisible` `episode-detail-boost`, tap it, `extendedWaitUntil` `boost-sheet` with `${TIMEOUT_FAST}`
- `extendedWaitUntil` `boost-sheet-connect` with `${TIMEOUT_SLOW}`
- `assertVisible` `boost-sheet-name` with `enabled: false`
- `assertVisible` `boost-sheet-message` with `enabled: false`
- `assertVisible` `boost-sheet-amount` with `enabled: true`
- `assertNotVisible` `boost-sheet-message-notice`
- `assertNotVisible` `boost-not-available`
- Tap `boost-sheet-close`, then `assertNotVisible` `boost-sheet`
- `runFlow: shared/login-seeded-user.yaml`
- Tap `episode-detail-boost` again, `extendedWaitUntil` `boost-sheet` with `${TIMEOUT_FAST}`
- `assertVisible` `boost-sheet-name`
- `assertVisible` `boost-sheet-amount`
- `assertVisible` `boost-sheet-connect`
- `assertNotVisible` `boost-not-available`
- Tap `boost-sheet-close`, then `assertNotVisible` `boost-sheet`
- Do not tap `boost-sheet-connect` or `boost-sheet-submit`
- Do not type into the name field, and do not assert that it is enabled after login

The E2E podcast has the lightning node value and MetaBoost row from plan 50, so the name and message fields render and the notice does not. The E2E Metro process sets an Alby client id and does not sign the device into Alby, so Connect is what the sheet shows. `launch-and-connect` clears app state, so the name pref is absent and the field is empty. The flow does not assert that empty string or the Anonymous placeholder. After login the MetaBoost host is not stubbed, so capability can fail and the fields can stay locked. The signed-out `enabled: false` checks are the lock check. The pref round-trip is the unit test.

## Do not

- Do not call `reqChannelGetByIdOrIdText` or `reqItemGetByIdOrIdText` from the sheet or the hook.
- Do not send from the merged tab's `method`.
- Do not post mb-v1. `runMobileManualBoost` already skips that post.
- Do not close the sheet when a payment succeeds.
- Do not refresh the received-boostagram list.
- Do not read `account_profile.display_name`, and do not clear `boost.sender_name` in `clearSession`.
- Do not edit the Alby session, the settings screens, web boost files, or plan 70's helpers except to import them.
- Do not add streaming sats, a phone node, a QR flow, or Nostr Wallet Connect.
