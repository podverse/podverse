**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Mobile reads public client config

The phone uses `GET /config` for signup mode, contact email, brand name, the membership catalog, and the playlist tag limits. The first screen still paints from the values already on the device. When the request fails, signup mode, contact email, and brand name stay as they are today. Playlist limits stay 5 and 50 until the payload arrives, and stay there if the request fails.

## Rows

R38, R39

## Runs after

100

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The fetch starts in `useEffect` inside `AppBody` (`apps/mobile/App.tsx`). It does not run before the first return of `App` or `AppBody`. Nothing network-bound blocks first paint.
- One in-flight promise. `AppBody`, checkout, and the Add by RSS limit reader share it. A failure resolves `null` and is not retried in a loop.
- `getMobileConfig()` keeps reading env for the API URL, list screens, billing mode, and the rest. Signup mode and contact email are the two fields it overlays from a successful payload, because those are the two instance settings the phone copies from env today.
- Brand name replaces `mobileBrandName()` only when the API string trims to a non-empty value. An empty string keeps the Expo config name, then `Podverse Next`. A failed request keeps that same fallback. `BRAND_NAME` is required on the API, so a successful body normally has a name. The trim check is only for a blank string.
- Contact email replaces the env address only when `isMobileContactMailbox` accepts it. An empty or invalid API address keeps `getMobileContactEmailFromEnv()`, including `contact@podverse.fm`. Mailto actions on the phone always have a mailbox today. The website does the opposite for this one field: a successful empty contact string replaces env. That split is intentional.
- The phone does not copy terms version, taste-profile agreement version, legal name, or stats retention days onto device env. Those four are still on the payload for other clients. Do not point `TermsAcceptanceProvider`, `MoreTermsOfServiceScreen`, `SignUpScreen`, or `MoreSettingsTasteProfileScreen` at them. Those screens keep `reqLegalTerms` and `reqLegalTasteProfileAgreement`, which already carry the version with the document.
- Switching the saved API (`clearLocalLibraryForApiSwitch`) drops the snapshot so the next load reads the new server. Do not fetch inside the clear.
- Offline Mode on: do not call the network. Leave the snapshot unset. That is the failure path.

## Store

`apps/mobile/src/config/publicClientConfig.ts`

Import `PublicClientConfig` and `PUBLIC_CLIENT_CONFIG_TIMEOUT_MS` from `@podverse/helpers/publicClientConfig`. Import `PLAYLIST_TAG_MAX_PER_PLAYLIST` and `PLAYLIST_TAG_NAME_MAX_LENGTH` from `@podverse/helpers/playlistTag`. Do not import the `@podverse/helpers` barrel. Do not read `process.env` in this file. `EXPO_PUBLIC_*` literals stay in `apps/mobile/src/config/env.ts`. Do not add a helpers subpath for signup mode.

Export the existing `isAccountSignupMode` from `apps/mobile/src/config/accountSignupModeEnv.ts`. It already imports `ACCOUNT_SIGNUP_MODE_VALUES` from `@podverse/helpers`. `publicClientConfig.ts` imports `isAccountSignupMode` from that file.

Export `isMobileContactMailbox(value: string): boolean` from `apps/mobile/src/config/env.ts`. It trims with the existing `trimToNull` and tests `CONTACT_EMAIL_PATTERN`. `getMobileContactEmailFromEnv` uses it. Do not copy the pattern into the new file.

- `loadPublicClientConfig(): Promise<PublicClientConfig | null>` returns the inner `data` object, not the `{ data }` envelope. It uses `createMobileApiRequestService()` from `apps/mobile/src/auth/mobileApi.ts` with no access token. `null` service, `isOfflineModeEnabled()` from `apps/mobile/src/prefs/offlineMode.ts`, or a thrown request returns `null`. Pass `reqPublicClientConfigGet({ controller: new AbortController(), timeoutMs: PUBLIC_CLIENT_CONFIG_TIMEOUT_MS })`.
- One module snapshot and a `useSyncExternalStore` subscribe pair. `usePlaylistTagLimits()` returns `{ maxPerPlaylist, nameMaxLength }`. Before the payload, and on failure, those are the two helper constants. After success, they are `playlistLimits`.
- `usePublicClientConfig()` returns the snapshot or `null`.
- `clearPublicClientConfig()` sets the snapshot back to unset and drops the in-flight promise so the next `loadPublicClientConfig()` fetches again.

`getMobileConfig()` in `apps/mobile/src/config/index.ts`: when the snapshot is set, `accountSignupMode` is `instance.signupMode` when `isAccountSignupMode` accepts it. Otherwise keep `getMobileAccountSignupModeFromEnv()`. `contactEmail` is `instance.contactEmail` when `isMobileContactMailbox` accepts it. Otherwise keep `getMobileContactEmailFromEnv()`.

`apps/mobile/src/navigation/index.tsx` calls `getMobileConfig()` once at module scope for `deepLinkSchemes` and `webBaseUrl` only. Leave that line. Those two fields stay on env.

`apps/mobile/src/lib/addByRss/deviceParse.ts` builds `userAgent` at module load from `mobileBrandName()`. Build it inside `deviceFetchDeps` instead, so the next parse sees a snapshot that arrived after launch. Leave `parseVersion` and `hostPacer` at module scope.

`mobileBrandName()` in `apps/mobile/src/lib/mobileBrandName.ts` returns the trimmed API brand when the snapshot has one, otherwise the current Expo-name logic.

`AppBody` in `apps/mobile/App.tsx` calls `void loadPublicClientConfig()` in an effect with an empty dependency list. When the promise settles, `setState` a generation number so the screens `AppBody` renders read `getMobileConfig()` and `mobileBrandName()` again. Do not await the promise before the first return. Do not put this in the serial sync queue and do not add a sync-indicator label.

`clearLocalLibraryForApiSwitch` calls `clearPublicClientConfig()` as the first statement, before `syncQueue.reset()`.

## Membership callers

`apps/mobile/src/membership/useStoreCheckout.ts`: inside `load`, replace `pricingApi.reqProductMembershipGet()` with `loadPublicClientConfig()`. Start that promise before the store-sync awaits, where the membership request starts today. The resolved value is `PublicClientConfig | null`, with no `data` wrapper. Read `membership.premiumMembershipCostMonthly`, `membership.premiumMembershipCostAnnually`, and `membership.annuallySavingsPercent`. Drop the `'data' in pricingResponse` check. `null` leaves `catalogPricing` unset.

`apps/mobile/src/lib/addByRss/feedLimit.ts`: `fetchAddByRssDefaultFeedLimit` reads `membership.maxAddByRSSFeeds` from `loadPublicClientConfig()`. The integer check stays. `null` snapshot or a bad number returns `null`. Do not change `fetchAccountAddByRssFeedLimit` (`GET /account/add-by-rss/feed-limit`).

`apps/mobile/src/components/membership/MembershipStoreCheckout.tsx` already reads `getMobileConfig().contactEmail` during render. Leave that read. Update the file comment so the prices are described as coming from `GET /config` (`membership`), not from `GET /product/membership`.

Login, account access, and the error log already call `getMobileConfig()` or `mobileBrandName()` during render. Do not copy those values into `useState` initializers. Do not add a mobile env for brand, legal name, terms version, taste version, stats days, or the tag limits.

Do not edit `PlaylistFormScreen.tsx`. The form calls `usePlaylistTagLimits()` when step 13 amends that plan.

Do not move `EXPO_PUBLIC_MOBILE_API_BASE_URL`, list-screen env, or the public web origin.

## Reuse

Signup mode and contact email stay on `getMobileConfig()`. Brand stays on `mobileBrandName()`. The new module is the snapshot those two functions read. Screens that already call them during render need no edit, except `deviceParse.ts`, which captured the brand at import time.

## Tests

Unit tests in `apps/mobile/src/config/publicClientConfig.test.ts` cover `applyMobilePublicClientConfig(remote, env)`. The store calls that function and keeps the result. The test does not boot React Native. `env` is `{ signupMode, contactEmail }`.

- `null` keeps a fixture signup mode and contact email, and limits 5 and 50.
- A payload with `signupMode: 'admin_only_username'` and a valid `contact@example.com` replaces both, and limits 8 and 40 replace 5 and 50.
- An unknown signup mode keeps the fixture mode.
- Contact email `not-an-email` keeps the fixture address.
- A separate assertion for brand: non-empty `brandName` wins; `''` does not.

No Maestro flow. The claim is the overlay, not a screen.

## Files

- `apps/mobile/src/config/publicClientConfig.ts`
- `apps/mobile/src/config/publicClientConfig.test.ts`
- `apps/mobile/src/config/accountSignupModeEnv.ts`
- `apps/mobile/src/config/env.ts`
- `apps/mobile/src/config/index.ts`
- `apps/mobile/src/lib/mobileBrandName.ts`
- `apps/mobile/src/lib/addByRss/deviceParse.ts`
- `apps/mobile/App.tsx`
- `apps/mobile/src/data/clearLocalLibraryForApiSwitch.ts`
- `apps/mobile/src/membership/useStoreCheckout.ts`
- `apps/mobile/src/lib/addByRss/feedLimit.ts`
- `apps/mobile/src/components/membership/MembershipStoreCheckout.tsx`

## Release scratchpad

none

Plan 104 appends the one scratchpad entry for this replacement.
