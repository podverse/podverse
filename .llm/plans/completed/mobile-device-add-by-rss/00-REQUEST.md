# Request: mobile on-device Add by RSS

## Request

I am thinking that this is a serious feature gap between v4 and v5, and we may upset some v4 users when they find out that they no longer can use the add by RSS feature. So I am thinking that we want to continue using our server based add by RSS parsing for logged in users, but for non logged in users on the mobile app, they should be able to parse feeds locally.

And one of the things we don't like about this is that the parser logic then becomes tied to a specific version of the mobile app because it's baked into it. Whereas with the server side parser, we can change that remotely without an approval from the mobile store. However, it seems like we are going to have to add some local parsing for Add by RSS on device.

So, create a plan to implement this on mobile. So, Add by RSS and also update any information across the app that says Add by RSS is a premium only feature. We want to make it now a feature that will work in the mobile app. When a user is not logged in, but it won't go through our server. It will instead rely on whatever the local parser is.

We want this to be as reusable with our modules as possible for consistency. We also want it to be integrated with our existing local storage processes for Add by RSS feeds. Ask if you have any questions or are concerned about major issues.

## Operator answers

- **Who uses on-device parsing?** Anyone without a valid membership: signed out, a free account, or a lapsed membership. Valid Trial and Premium members keep the server parse.
- **How should mobile reuse the server's RSS parser (`podverse-partytime`)?** Publish a React Native-safe entry point in `podverse-partytime` with no `fs`, `node-fetch`, `dotenv`, `pino` or `Buffer`, and have the server use the same entry point.
- **Can password-protected feeds be added through on-device parsing?** Yes. Follow redirects by hand and send the password only to in-scope hosts, checked on both iOS and Android.
- **Where does the set run?** In this checkout, on the current branch. No separate worktree.

## Background from the v4 legacy app

v4 mobile (`../podverse-rn`) lets signed-out users use Add by RSS. The feed is parsed on the device and stored locally (`src/state/actions/parser.ts`, `src/services/parser.ts`). Only signed-in users write the feed URL to the server (`/add-by-rss-podcast-feed-url/*`), and those v4 API routes require `hasValidMembership`.

## Glossary

- "add by RSS" or "AdByRSS" means Add by RSS.
- "local parser" means on-device RSS parsing in `apps/mobile`.
- "logged in" means signed in. Per the operator's answer above, the on-device path is chosen by membership, not by sign-in alone.

## Orientation

These files were checked during the request chat.

- `packages/helpers/src/lib/accessTier.ts` holds `add_by_rss_add`, `add_by_rss_refresh` (both at the `membership` tier) and `add_by_rss_view` (`anonymous`). Web uses the same keys, under `apps/web/src/utils/addByRSS/*`.
- `packages/parser/src/lib/rss/addByRSS.ts` holds `parseRSSFeedForAddByRSS`: the conditional GET, the raw-feed MD5 hash, the partytime `parseFeed` call, `Buffer` for Basic auth, and the per-host rate-limit delay.
- `packages/parser/src/lib/rss/addByRSSRedirectAuth.ts`: `buildCredentialScopedBeforeRedirect` checks every redirect hop with `resolveCredentialScope` from `@podverse/helpers`.
- `packages/parser/src/lib/rss/hash/rawFeed.ts`: `getRawFeedMd5Hash`.
- `node_modules/podverse-partytime` (v5.1.0, CommonJS): `dist/config.js` loads `dotenv`, `dist/logger.js` loads `pino`, `dist/shared.js` loads `fs` and `node-fetch`, and `parseFeed` uses `Buffer.byteLength`. Dependencies are `fast-xml-parser`, `he`, `ramda` and `tiny-invariant`. The source repo is `github.com/podverse/podverse-partytime`, outside this monorepo.
- `apps/mobile/src/data/repositories/addByRssRepository.ts` covers the server parse and poll (`parseNow`, `enqueueParseRequest`, `requestRefreshAll`, `applyRefreshResult`, `upsertFeed`).
- `apps/mobile/src/lib/addByRss/domain.ts` holds `pollAddByRssParseStatus` and maps through `convertParsedRSSFeedToCompat` from `@podverse/parser-mapping`.
- `apps/mobile/src/data/db/schema.ts`: the `add_by_rss_feed` table stores `mapped_feed_json`, the related tables are `add_by_rss_listed_feed` and `add_by_rss_credential_index`, and the secrets live in `addByRssCredentialStore.ts`.
- `apps/mobile/src/sync/syncJobs.ts`: the `add-by-rss-refresh`, `add-by-rss-parse` and `add-by-rss-listed-feeds` jobs skip when there is no account or no membership.
- Mobile call sites of `add_by_rss_add` and `add_by_rss_refresh`:
  - `hooks/useAddByRssAddFlow.ts`
  - `screens/rss/AddByRssRootScreen.tsx`
  - `screens/home/AddByRssHomeDetailScreen.tsx`
  - `screens/home/addByRss/useAddByRssFeedCheck.ts`
  - `screens/rss/useAddByRssCredentialsForm.ts`
  - `screens/library/useAddToPlaylist.tsx`
  - `screens/library/LibraryPlaylistsScreen.tsx`
  - `lib/offlineModeViews.ts`
  - `data/repositories/directoryChannelGone.ts`
- `apps/mobile/package.json` already depends on `@podverse/parser-mapping`, `@podverse/helpers`, `@podverse/helpers-requests` and `@podverse/helpers-validation` through `file:` links. `apps/mobile/AGENTS.md` forbids `@podverse/parser` on the device.
- Guidance that names Add by RSS as membership-only:
  - `.cursor/rules/mobile-anonymous-vs-account-features.mdc` (the tier table and the lapsed-behavior line)
  - `.cursor/rules/add-by-rss-client-held-credentials.mdc`
  - `.cursor/rules/add-by-rss-data-contracts.mdc`
  - `docs/features/ADD-BY-RSS.md`
  - `docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md`
- Mobile E2E flows: `apps/mobile/e2e/add-by-rss*.yaml` and `membership-gate.yaml`.

## Concerns raised in the request chat

- React Native follows redirects natively, so the server's hook that drops the password on each redirect hop does not port. On-device password support depends on manual-redirect fetching (for example `expo/fetch` with `redirect: 'manual'`) working on both platforms.
- Some work is server-only: the artist and album fan-out, Podcast Index directory matching, chapters and transcripts through the API, and remote-item lookup. Plan what happens to these for feeds parsed on the device.
- Browsers block cross-site RSS fetches (CORS), so web cannot parse feeds itself. Record any difference between web and mobile as intentional.
- Feeds parsed on the device run whatever parser shipped with that app version, and feed hosts now see requests from each phone instead of our servers.
- The transitions need defined behavior: signing up, signing into an existing account, a membership lapsing, and a membership renewing.

### Review of the first planning pass

The operator reviewed D1–D31 in `00-SUMMARY.md` one at a time. Where an answer below conflicts with an earlier operator answer or with a plan, the answer below wins.

**Revised: who uses on-device parsing.** This replaces the first operator answer ("anyone without a valid membership"). In the operator's words: "We never want logged-in users to use the local feed parsing route because we need to ensure consistency between it and other devices."

- Signed-out users parse on the device, with no feed limit: "Users who are not logged in, on the other hand, should have no limit for their ad by feed URLs."
- Signed-in users always use the server parse, whatever their membership.
- A signed-in user with a free account or a lapsed membership behaves as today. Adding is blocked behind the membership prompt, and existing feeds stay playable but stop refreshing. There is no device parse and no saved-for-later state for them.

**Accepted as planned:** D1, D2, D3, D4, D12, D13, D14, D15, D16, D17, D18, D21, D25, D26, D27, D29 and D31. Apply D14's knock-on edit to plan 31: "A thrown error (offline, Offline Mode, DNS, abort)" becomes "Offline Mode or abort". Where an accepted decision mentions free or lapsed accounts parsing on the device, narrow it to signed-out users.

**D5:** a signed-in user's Add by RSS action always uses the server parse, including while the account snapshot is loading. Drop the fallback where a "needs membership" or "membership expired" 403 moves the action to the device. Those 403s open the membership gate, as today.

**D6 and limits:**

- A signed-in user at their limit is told they have reached it and that they can contact the support email to have it raised. In the operator's words: "if a user tries to exceed their limit while they are logged in, then they should be told that they have reached their limit. And if they would like it to be increased, they should reach out to the support email."
- Trial and Premium share one Add by RSS limit. Per-account overrides (`max_add_by_rss_feeds`) still apply. Replace the separate Trial and Premium defaults (`MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS` and `MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS` in `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`, and `packages/helpers/src/lib/accountTrust.ts`) with one shared default, and update the copy that describes separate limits (`membership.trial_limitations_add_by_rss_feed_limit`).
- Build this in this set. Also change the Trial line in the deferred plan `.llm/plans/active/account-add-by-rss-cap-500.md` (and its "two refusals" section) so it matches one shared limit.
- Add a public API endpoint that returns the server's current default Add by RSS limit. The device needs it before an account exists, and the server can change it without a mobile release. A signed-in device reads its own account's limit (the default or its override) from the server.

**D7:** feeds added on the device while signed out have no limit.

**D8:** dropped. No pending or saved-for-later state for free or lapsed accounts (see the revised answer above).

**D9: sign-up with more device feeds than the limit.** Show a special screen before the sign-up screen whenever the phone's Add by RSS feeds would put the new account over the limit. The screen:

- states the Add by RSS limit number;
- explains clearly and concisely that behavior may not work as expected and that they may lose current Add by RSS feed URLs because of the limit;
- recommends using Export OPML first, so they keep a copy for easy restoration later;
- has a show/hide control with a longer, detailed explanation;
- says somewhere that they can contact support with any questions;
- requires a checkbox accepting the data-loss risk before they can continue to sign-up.

After they accept and sign up, the oldest followed device feeds, up to the limit, are saved to the new account. The rest are removed from the app; nothing retries them later.

**D10: sign-in to an existing account.** Push nothing; the account is the source of truth. Device feeds the account does not have stay stored on the phone, hidden and not refreshed while signed in. After sign-out they show again and refresh on the device.

**D11, D19, D20: credentials saved while signed out.**

- At sign-up, the credentials of feeds saved to the account move to the account, and the credentials of removed feeds are deleted.
- At sign-in to an existing account, signed-out credentials stay with the hidden device feeds.
- Sign-out clears only the account's credentials and keeps the signed-out ones.

**D22:** the remote-item lookup and resolve routes become public. The operator: "you can make lookup endpoints public for data that is not supposed to be private. And also, bear in mind that these feeds could potentially contain quite a lot of rows. We don't want the rate limit to be overly aggressive necessarily."

- Lookup keeps no rate limit; the device batches references 100 per request.
- Resolve for signed-out callers uses its own env var, `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE`, defaulting to 120 per IP. Signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per account.
- The device queues resolve calls in background sync and waits and retries on a 429 instead of failing.
- Plan 40 must say signed-out, not "signed out, free, or lapsed".

**D23:** guid-only listed albums that the directory and stub tables do not know are resolved through the queued, paced resolve calls. Rows fill in as answers arrive.

**D24:** accepted. When a password-protected artist feed is parsed on the device, its references are not sent for lookup or resolve.

**D28:** chapters and transcripts: a signed-in user always uses the API, and a signed-out user fetches on the device.

**D30:** accepted. The comparison row checks both columns with the existing free-on-mobile mark. Plan 50's mention of Trial feed limits changes to the shared limit.

### Review of the second planning pass

The operator reviewed D32–D46 in `00-SUMMARY.md`. Where an answer below conflicts with an earlier operator answer, the first-pass review, or a plan, the answer below wins.

**Accepted as planned:** D33, D34, D35, D36, D37, D38, D39, D41, D42, D43 and D44. In the operator's words:

- D33: "number plus Email Support mailto button".
- D34: "one row owned by the account".
- D35: "account feeds stay listed and refreshed after sign-out".
- D36: "hide earlier-account rows and pass them to the signed-out user".
- D37: "account gets at most the limit and extras followed between sign-up and first login stay on the phone".
- D38: "no membership means nothing saved and nothing removed".
- D39: "tap on 429 shows the notice with no retry".
- D41: "500 ms spacing".
- D42: "in-memory per-pod counting".
- D43: "error with Retry before sign-up".
- D44: "own Export OPML button".

**D32: the limit sentence moves to the mobile Add by RSS screen.** "move the limit sentence out of the Trial limitations list (remove its Trial key and the Trial line edit) and show it as help text under the add field on the mobile Add by RSS screen, worded 'Add by RSS holds up to {max_feeds} feeds.'"

- Remove `membership.trial_limitations_add_by_rss_feed_limit` and its line in the Trial limitations list, and drop plan 60's rewrite of that sentence and its callers. Web's membership page no longer states the Add by RSS limit.
- "The Trial line edit" is plan 60's rewrite of the Trial limitations sentence. The Trial line and "two refusals" edits in the deferred `.llm/plans/active/account-add-by-rss-cap-500.md` (R29) stay as step 07 wrote them.
- The help text sits under the add field on the mobile Add by RSS screen (`AddByRssRootScreen.tsx`). Signed-out adds have no limit (R24), so the sentence shows only for a signed-in user whose account limit is known.

**D40: no-match versus a temporary directory failure.** "not_found and 400 mark resolve_no_match until the artist feed changes; directory_unavailable is temporary and retried later with backoff."

**D45: signed-out OPML export includes directory podcasts.** "signed-out OPML export, from both the sign-up warning and More OPML, looks up directory feed URLs from the API by id_text and exports everything; if some lookups fail, export what was found and say how many directory podcasts were left out."

**D46: credentials for a feed both the signed-out user and the account follow.** "at sign-in, copy the signed-out username and password to the account on this phone when a shared feed becomes the account feed, unless the account already has a pair; plans 22 and 34 change together in one step." The signed-out copy stays, so R42 still holds, and it is used again after sign-out.
