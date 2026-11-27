**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Web reads public client config

The website uses `GET /config` for the seven instance settings, the membership catalog, and the playlist tag limits. When that request fails, those seven settings stay on today's env. Playlist limits stay 5 and 50. API URLs, web-only infrastructure, and Home, Browse, and playlists opening defaults stay on env.

## Rows

R38, R39

## Runs after

100

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The root layout awaits the config before it renders, with a 2 second cap. The first HTML then already has the API values when the request succeeds. The other approach was painting env and swapping after hydration.
- A failed request, a non-200, or a body that is not the three groups leaves the whole overlay off. Do not apply a partial body.
- An unknown `signupMode` (not one of `ACCOUNT_SIGNUP_MODE_VALUES`) keeps the env mode. A known mode replaces it, including a mode this page would not have chosen.
- Empty strings from the API replace env. Empty is a value. Only a failed request keeps env.
- `useConfig()` is the client read. `getConfig()` stays the env object, so a client component that still calls `getConfig()` for one of the seven fields is wrong. Server components await `getConfigResolved()`.
- Do not edit `apps/web/src/config/index.ts`, `runtime-config.ts`, or the sidecar. Plans 60 and 61 own the playlists opening defaults in those files. Playlist limits are added on the resolved object, not in `buildConfig`.

## What moves

On success, copy only these fields onto the env config:

| From `data` | Onto the web config |
| --- | --- |
| `instance.brandName` | `public.brand.name` |
| `instance.legalName` | `public.legal.name` |
| `instance.contactEmail` | `public.contact.email` and `public.account.contactEmail` |
| `instance.signupMode` | `public.account.signupMode` |
| `instance.termsVersion` | `public.legal.terms.version` |
| `instance.tasteProfileAgreementVersion` | `public.legal.tasteProfileAgreement.version` |
| `instance.statsRetentionDays` | `public.stats.trackEventRetentionDays` |
| `playlistLimits` | `public.playlistLimits` |

`public.playlistLimits` is always present on the resolved object. On failure it is `PLAYLIST_TAG_MAX_PER_PLAYLIST` and `PLAYLIST_TAG_NAME_MAX_LENGTH` from `@podverse/helpers` (5 and 50). There is no web env for those two.

## What stays on env

Do not overlay, and do not remove, any of these:

- API URLs: `public.api` (ssr, client, prefix, version)
- Web origin, brand domain, logos, logo height flag, favicon and manifest icon URLs, theme colors
- `app_value` (Lightning, Metaboost)
- Polling, locales, catalog, theme, custom themes
- `listScreens` (Home and Browse chip, sort, and view)
- `playlistsPage` (sort, range, and any later playlists opening default)
- Web push VAPID key, socials, cookie consent, PayPal client id, `server_env`
- Image proxy, Next image optimization, mobile app-link files
- Proxy cache and proxy user agent
- Observability and integrations

`apps/web/src/app/membership/renew/page.tsx` reads `public.paypal.clientId` only. Leave that file on `getConfig()`.

## Loader

`apps/web/src/config/publicClientConfig.ts` (no server imports, safe for the unit test and for client types):

- `ResolvedWebConfig` is `WebConfig` with `public.playlistLimits: { maxPerPlaylist: number; nameMaxLength: number }`.
- `applyPublicClientConfig(base: WebConfig, remote: PublicClientConfig | null): ResolvedWebConfig`.
- `null` returns `base` plus the two helper constants.
- A remote value overlays the table above. Import `PublicClientConfig` and `ACCOUNT_SIGNUP_MODE_VALUES` from `@podverse/helpers`.

`apps/web/src/config/loadPublicClientConfig.server.ts`:

- `cache()` from `react`, so one request shares one fetch.
- Call `getSSRApiRequestService().reqPublicClientConfigGet({ controller: new AbortController(), timeoutMs: PUBLIC_CLIENT_CONFIG_TIMEOUT_MS })`. Import the timeout from `@podverse/helpers`. Plan 100 already accepts that abort argument. Do not edit helpers-requests in this plan.
- Any throw, or a `data` object missing `membership`, `playlistLimits`, or `instance`, returns `null`.
- `getConfigResolved()` awaits that load and returns `applyPublicClientConfig(getConfig(), remote)`.

`getConfig()` keeps reading the runtime sidecar through `getRuntimeConfig()`. It does not see this overlay. Server components that need a moved field await `getConfigResolved()`. Client components read `useConfig()`.

## Call sites

`apps/web/src/app/layout.tsx`: delete the module-level `staticConfig`. Replace `export const metadata` with `generateMetadata` that awaits `getConfigResolved()` for the title, the title template, and `openGraph.siteName`. The Open Graph image still uses the env logo from `getConfig()`. Pass `await getConfigResolved()` into `Providers` and into the terms check. Do not fetch a second time; both calls hit the same `cache()`.

`apps/web/src/contexts/Config.tsx`: the context value is `ResolvedWebConfig`. `useConfig()` returns that type. `bindWebListScreenDefaults` still reads `config.public.listScreens` from the env half. Do not overwrite list screens from the API.

`apps/web/src/providers/Providers.tsx`: the `config` prop is `ResolvedWebConfig`.

Components that already call `useConfig()` pick up the overlay with no edit. That includes the navbar, footer, sidebar, auth sign-up form, account access, donate, recommendations, boost forms, and the taste-profile switch.

Switch every remaining `getConfig()` read of the seven fields:

- `apps/web/src/utils/auth/ssrAuth.ts` — the function that reads `configuredTermsVersion` is already async. Replace that `getConfig()` with `await getConfigResolved()`.
- `apps/web/src/lib/seo/buildStaticPageMetadata.ts` and `buildContentMetadata.ts` stay synchronous. Add required `brandName: string` to both input types. The title and description fallbacks use that argument. They do not call `getConfig()` for the name. `buildOpenGraphImage` still reads the logo from `getConfig()`. Do not edit `buildOpenGraphImage.ts`.
- `apps/web/src/lib/seo/curatedPageMetadata.ts` awaits `getConfigResolved()` and passes `public.brand.name` into the translations and as `brandName`.
- Every `generateMetadata` below awaits `getConfigResolved()` and passes `public.brand.name` as `brandName`. Do not change the rest of those pages.
  - `apps/web/src/app/track/[item_id]/page.tsx`
  - `apps/web/src/app/profile/[id_text]/page.tsx`
  - `apps/web/src/app/podcast/livestream/[item_id]/page.tsx`
  - `apps/web/src/app/podcast/[channel_id]/page.tsx`
  - `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx`
  - `apps/web/src/app/playlist/[playlist_id]/page.tsx`
  - `apps/web/src/app/official-clip/[item_soundbite_id]/page.tsx`
  - `apps/web/src/app/music/livestream/[item_id]/page.tsx`
  - `apps/web/src/app/episode/[item_id]/page.tsx`
  - `apps/web/src/app/clip/[clip_id]/page.tsx`
  - `apps/web/src/app/chapter/[item_chapter_id_text]/page.tsx`
  - `apps/web/src/app/artist/[channel_id]/page.tsx`
  - `apps/web/src/app/album/[channel_id]/page.tsx`
- `apps/web/src/lib/seo/buildStaticPageMetadata.test.ts` and `buildContentMetadata.test.ts` pass `brandName: 'Podverse'`. Keep their `getConfig` mocks. The logo path still uses them.
- `apps/web/src/app/manifest.ts` becomes `export default async function manifest`. `name` and `short_name` are `getConfigResolved().public.brand.name`. When that string is empty, keep today's `optionalEnvString(env.NEXT_PUBLIC_BRAND_NAME) ?? 'Podverse'`. Icon, theme, and background URLs stay on `getRuntimeConfig()`.
- `apps/web/src/app/checkout/page.tsx` — signup mode and contact email from `getConfigResolved()`. The SSR price request stays `reqMembershipGetPricing()`.
- `apps/web/src/app/checkout/CheckoutPageClient.tsx` — replace `reqProductMembershipGet()` with `reqPublicClientConfigGet()`. Read `data.membership.premiumMembershipCostMonthly`, `premiumMembershipCostAnnually`, and `annuallySavingsPercent`. Keep the rest of the price-state mapping, including `freeTrialExpiration: 0` and `freeTrialDays: 0`. A failed config request still keeps the SSR pricing already in state.
- `apps/web/src/app/membership/page.tsx` — signup mode and contact email from `getConfigResolved()`.
- Client components that call `getConfig()` for signup mode or contact email switch to `useConfig()`: `SettingsAccount.tsx`, `ModalAuthLogin.tsx`, `SignUpClient.tsx`, `ForgotPasswordPageClient.tsx`, `ResetPasswordPageClient.tsx`.
- `apps/web/src/app/v4v/metaboost/page.tsx` is an async server component. Its `generateMetadata` already goes through `getCuratedStaticPageMetadata`, which plan switches to `getConfigResolved()`. The page body reads `config.public.brand.name` from `getConfig()` today. Change that read to `(await getConfigResolved()).public.brand.name`. Leave the Metaboost node values on env.

`apps/web/src/constants/contact.ts` must not call `getConfig()`. Delete `getContactEmail` and `CONTACT_EMAIL_LINKS`. Export `contactEmailLinks(email: string, brandName: string)` returning `{ BUG_REPORT, FEATURE_REQUEST, PODCAST_REQUEST, CONTENT_ISSUE, GENERAL }` with the same mailto strings the getters build today. Update:

- `apps/web/src/app/contact/ContactPageClient.tsx`
- `apps/web/src/hooks/useMembershipGate.ts`
- `apps/web/src/components/Settings/Panels/SettingsOpml/SettingsOpml.tsx`
- `apps/web/src/components/Modal/QueueHistoryLimitNotice.tsx`
- `apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx`

Each of those is a client component. `ContactPageClient` passes `useConfig().public.contact.email` and `useConfig().public.brand.name` into `contactEmailLinks`. The other four only need the address: pass `useConfig().public.contact.email` and delete the `getContactEmail` import. `PodcastIndexFeedClient` already reads brand from `useConfig()`; leave that read.

Search `apps/web/src` again for `getConfig()` next to `brand.name`, `legal`, `contact`, `signupMode`, `terms.version`, `tasteProfileAgreement`, and `trackEventRetentionDays`. Switch any hit this list missed. Leave hits that only read API URLs, PayPal, logos, list screens, or playlists opening defaults.

Do not edit the playlist form. Plan 40 owns `PlaylistForm.tsx`. The form reads `useConfig().public.playlistLimits` when step 13 amends that plan.

Do not remove `NEXT_PUBLIC_*` keys. They are the failure fallback. Docs and GitOps comments are plan 104.

## Reuse

`ConfigProvider` and `useConfig()` stay the one config context. This plan changes the value the root layout passes in. It does not add a second provider. `applyPublicClientConfig` is the only merge.

## Tests

Unit test `apps/web/src/config/publicClientConfig.test.ts`:

- `null` keeps a fixture brand name, signup mode, contact email, legal name, terms version, taste version, and stats days, and sets playlist limits to 5 and 50.
- A payload replaces each of those, including both contact fields, and sets playlist limits to the payload numbers (use 8 and 40 so they cannot be confused with the constants).
- A payload whose `signupMode` is not one of the three modes keeps the fixture mode and still applies the other fields.

No new Playwright spec. The test profile sets the same brand on the API and on the web env, so a page assertion cannot tell which source won. Checkout prices still load through `GET /product/membership/pricing`. No spec mentions `/product/membership` as a browser request.

## Files

- `apps/web/src/config/publicClientConfig.ts`
- `apps/web/src/config/publicClientConfig.test.ts`
- `apps/web/src/config/loadPublicClientConfig.server.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/manifest.ts`
- `apps/web/src/contexts/Config.tsx`
- `apps/web/src/providers/Providers.tsx`
- `apps/web/src/utils/auth/ssrAuth.ts`
- `apps/web/src/lib/seo/curatedPageMetadata.ts`
- `apps/web/src/lib/seo/buildStaticPageMetadata.ts`
- `apps/web/src/lib/seo/buildStaticPageMetadata.test.ts`
- `apps/web/src/lib/seo/buildContentMetadata.ts`
- `apps/web/src/lib/seo/buildContentMetadata.test.ts`
- `apps/web/src/app/track/[item_id]/page.tsx`
- `apps/web/src/app/profile/[id_text]/page.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/page.tsx`
- `apps/web/src/app/podcast/[channel_id]/page.tsx`
- `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx`
- `apps/web/src/app/playlist/[playlist_id]/page.tsx`
- `apps/web/src/app/official-clip/[item_soundbite_id]/page.tsx`
- `apps/web/src/app/music/livestream/[item_id]/page.tsx`
- `apps/web/src/app/episode/[item_id]/page.tsx`
- `apps/web/src/app/clip/[clip_id]/page.tsx`
- `apps/web/src/app/chapter/[item_chapter_id_text]/page.tsx`
- `apps/web/src/app/artist/[channel_id]/page.tsx`
- `apps/web/src/app/album/[channel_id]/page.tsx`
- `apps/web/src/constants/contact.ts`
- `apps/web/src/app/contact/ContactPageClient.tsx`
- `apps/web/src/hooks/useMembershipGate.ts`
- `apps/web/src/components/Settings/Panels/SettingsOpml/SettingsOpml.tsx`
- `apps/web/src/components/Modal/QueueHistoryLimitNotice.tsx`
- `apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx`
- `apps/web/src/app/checkout/page.tsx`
- `apps/web/src/app/checkout/CheckoutPageClient.tsx`
- `apps/web/src/app/membership/page.tsx`
- `apps/web/src/components/Settings/Panels/SettingsAccount/SettingsAccount.tsx`
- `apps/web/src/components/Modal/ModalAuthLogin.tsx`
- `apps/web/src/app/sign-up/SignUpClient.tsx`
- `apps/web/src/app/forgot-password/ForgotPasswordPageClient.tsx`
- `apps/web/src/app/reset-password/ResetPasswordPageClient.tsx`
- `apps/web/src/app/v4v/metaboost/page.tsx`

## Release scratchpad

none

Plan 104 appends the one scratchpad entry for this replacement.
