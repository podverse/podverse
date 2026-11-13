# Mobile on-device Add by RSS — summary

Request: [00-REQUEST.md](00-REQUEST.md). Prompts, models, and phases: [COPY-PASTA.md](COPY-PASTA.md)
and [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

Signed-out users parse Add by RSS feeds on the phone with a React Native-safe
`podverse-partytime` entry point, with no feed limit. Every signed-in user uses the server parse;
free and lapsed accounts keep today's membership gate. Trial and Premium share one Add by RSS
limit. Feeds from either path land in the same device storage, and sign-up, sign-in, and
sign-out move feeds and credentials as the transitions below describe.

## Requirement ledger

- **R1** (area C) "we want to continue using our server based add by RSS parsing for logged in users" — Plan: 30, 32
- **R2** (area C) "for non logged in users on the mobile app, they should be able to parse feeds locally" / "We want to make it now a feature that will work in the mobile app" — Plan: 32, 33
- **R3** (area B) "the parser logic then becomes tied to a specific version of the mobile app because it's baked into it" / "Feeds parsed on the device run whatever parser shipped with that app version" — say how a device-parsed feed picks up parser fixes from a later build — Plan: 21
- **R4** (area E) "update any information across the app that says Add by RSS is a premium only feature" — Plan: 50, 51, 52
- **R5** (area C) "When a user is not logged in, but it won't go through our server. It will instead rely on whatever the local parser is." — Plan: 31, 32, 33
- **R6** (area B) "We want this to be as reusable with our modules as possible for consistency." — Plan: 20, 21
- **R7** (area C) "We also want it to be integrated with our existing local storage processes for Add by RSS feeds." — Plan: 30, 31, 33
- **R8** (area C) "Anyone without a valid membership: signed out, a free account, or a lapsed membership. Valid Trial and Premium members keep the server parse." (revised by R23: only signed-out users parse on the device) — Plan: 30, 32
- **R9** (area A) "Publish a React Native-safe entry point in `podverse-partytime` with no `fs`, `node-fetch`, `dotenv`, `pino` or `Buffer`" — Plan: 10
- **R10** (area A) "and have the server use the same entry point" — Plan: 11
- **R11** (area B) "Can password-protected feeds be added through on-device parsing? Yes." — Plan: 22
- **R12** (area B) "Follow redirects by hand and send the password only to in-scope hosts, checked on both iOS and Android." — Plan: 21, 22
- **R13** (area D) "Some work is server-only: the artist and album fan-out … Plan what happens to these for feeds parsed on the device." — Plan: 42
- **R14** (area D) "Podcast Index directory matching" (server-only work; plan what happens for device-parsed feeds) — Plan: 40, 42
- **R15** (area D) "chapters and transcripts through the API" (server-only work; plan what happens for device-parsed feeds) — Plan: 41, 43
- **R16** (area D) "remote-item lookup" (server-only work; plan what happens for device-parsed feeds) — Plan: 40, 44
- **R17** (area E) "Browsers block cross-site RSS fetches (CORS), so web cannot parse feeds itself. Record any difference between web and mobile as intentional." — Plan: 52
- **R18** (area B) "feed hosts now see requests from each phone instead of our servers" — Plan: 21
- **R19** (area C) "The transitions need defined behavior: signing up" — Plan: 34
- **R20** (area C) "signing into an existing account" — Plan: 34
- **R21** (area C) "a membership lapsing" — Plan: 33
- **R22** (area C) "and a membership renewing" — Plan: 33

Rows R23–R49 come from the operator's review of the first planning pass (`00-REQUEST.md`
§ Review of the first planning pass). Each names its area and the second-pass planning step.

- **R23** (area C, step 08) "We never want logged-in users to use the local feed parsing route because we need to ensure consistency between it and other devices." Signed-in users always use the server parse, whatever their membership — Plan: 30, 32, 33
- **R24** (area C, step 08) "Users who are not logged in, on the other hand, should have no limit for their ad by feed URLs." — Plan: 30, 32
- **R25** (area C, step 08) "A signed-in user with a free account or a lapsed membership behaves as today. Adding is blocked behind the membership prompt, and existing feeds stay playable but stop refreshing. There is no device parse and no saved-for-later state for them." — Plan: 32, 33
- **R26** (area C, step 08) "a signed-in user's Add by RSS action always uses the server parse, including while the account snapshot is loading. Drop the fallback … Those 403s open the membership gate, as today." — Plan: 30, 32
- **R27** (area F, step 07) "if a user tries to exceed their limit while they are logged in, then they should be told that they have reached their limit. And if they would like it to be increased, they should reach out to the support email." — Plan: 63
- **R28** (area F, step 07) "Trial and Premium share one Add by RSS limit. Per-account overrides (`max_add_by_rss_feeds`) still apply. Replace the separate Trial and Premium defaults … with one shared default, and update the copy that describes separate limits (`membership.trial_limitations_add_by_rss_feed_limit`)." — Plan: 60, 61 (R50 removes that key instead of rewriting it)
- **R29** (area F, step 07) "Also change the Trial line in the deferred plan `.llm/plans/active/account-add-by-rss-cap-500.md` (and its "two refusals" section) so it matches one shared limit." — Plan: 60 (already done in the deferred plan during planning; no implementation edit)
- **R30** (area F, step 07) "Add a public API endpoint that returns the server's current default Add by RSS limit. The device needs it before an account exists, and the server can change it without a mobile release." — Plan: 62
- **R31** (area F, step 07) "A signed-in device reads its own account's limit (the default or its override) from the server." — Plan: 62
- **R32** (area G, step 10) "Show a special screen before the sign-up screen whenever the phone's Add by RSS feeds would put the new account over the limit." — Plan: 71
- **R33** (area G, step 10) "states the Add by RSS limit number" — Plan: 71
- **R34** (area G, step 10) "explains clearly and concisely that behavior may not work as expected and that they may lose current Add by RSS feed URLs because of the limit" — Plan: 71
- **R35** (area G, step 10) "recommends using Export OPML first, so they keep a copy for easy restoration later" — Plan: 70, 71
- **R36** (area G, step 10) "has a show/hide control with a longer, detailed explanation" — Plan: 71
- **R37** (area G, step 10) "says somewhere that they can contact support with any questions" — Plan: 71
- **R38** (area G, step 10) "requires a checkbox accepting the data-loss risk before they can continue to sign-up" — Plan: 71
- **R39** (area C, step 08) "After they accept and sign up, the oldest followed device feeds, up to the limit, are saved to the new account. The rest are removed from the app; nothing retries them later." — Plan: 34
- **R40** (area C, step 08) "sign-in to an existing account. Push nothing; the account is the source of truth. Device feeds the account does not have stay stored on the phone, hidden and not refreshed while signed in. After sign-out they show again and refresh on the device." — Plan: 30, 33, 34
- **R41** (area B, step 11) "At sign-up, the credentials of feeds saved to the account move to the account, and the credentials of removed feeds are deleted." — Plan: 22
- **R42** (area B, step 11) "At sign-in to an existing account, signed-out credentials stay with the hidden device feeds." — Plan: 22
- **R43** (area B, step 11) "Sign-out clears only the account's credentials and keeps the signed-out ones." — Plan: 22
- **R44** (area D, step 09) "you can make lookup endpoints public for data that is not supposed to be private … We don't want the rate limit to be overly aggressive necessarily." Lookup keeps no rate limit; the device batches references 100 per request — Plan: 40, 42, 44
- **R45** (area D, step 09) "Resolve for signed-out callers uses its own env var, `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE`, defaulting to 120 per IP. Signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per account." — Plan: 40
- **R46** (area D, step 09) "The device queues resolve calls in background sync and waits and retries on a 429 instead of failing." — Plan: 42
- **R47** (area D, step 09) "guid-only listed albums that the directory and stub tables do not know are resolved through the queued, paced resolve calls. Rows fill in as answers arrive." — Plan: 42
- **R48** (area D, step 09) "chapters and transcripts: a signed-in user always uses the API, and a signed-out user fetches on the device." — Plan: 43
- **R49** (area E, step 12) "Plan 50's mention of Trial feed limits changes to the shared limit." — Plan: 50

Rows R50–R55 come from the operator's review of the second planning pass (`00-REQUEST.md`
§ Review of the second planning pass). Each names its area and the third-pass planning step.

- **R50** (area F, step 13) "move the limit sentence out of the Trial limitations list (remove its Trial key and the Trial line edit)" — Plan: 60
- **R51** (area F, step 13) "show it as help text under the add field on the mobile Add by RSS screen, worded 'Add by RSS holds up to {max_feeds} feeds.'" — Plan: 64
- **R52** (area D, step 14) "not_found and 400 mark resolve_no_match until the artist feed changes; directory_unavailable is temporary and retried later with backoff." — Plan: 42
- **R53** (area G, step 15) "signed-out OPML export, from both the sign-up warning and More OPML, looks up directory feed URLs from the API by id_text and exports everything" — Plan: 70
- **R54** (area G, step 15) "if some lookups fail, export what was found and say how many directory podcasts were left out." — Plan: 70
- **R55** (areas B and C, step 16) "at sign-in, copy the signed-out username and password to the account on this phone when a shared feed becomes the account feed, unless the account already has a pair" — Plan: 22, 34

## Seams fixed here

These let areas C and D plan in wave 1 and 2 without reading area B's plans. An area may add
fields or options; it does not rename or remove what is named here. A plan that needs a change to
a seam says so under `## Notes for later prompts`.

- **Device parse function** (area B owns): `parseAddByRssFeedOnDevice` in
  `apps/mobile/src/lib/addByRss/deviceParse.ts`. Input: `feedUrl`, optional `credentials`
  (`{ username, password }`, read by the caller from `addByRssCredentialStore`), optional
  conditional cache (`feedHash`, `etag`, `lastModified`), optional `AbortSignal`. Returns the same
  shape as `AddByRssPollResult` in `apps/mobile/src/lib/addByRss/domain.ts` (status `parsed`,
  `not_modified` or `failed`, `mappedFeed`, `preview`, `failureReason`, `httpStatus`,
  `authChallenge`, `credentialsState`, `publisherListedFeeds` when the parse can fill it), plus
  the conditional cache to store for the next fetch. It makes no request to the Podverse API.
- **Parse path decision** (area C owns): `resolveAddByRssParsePath` in
  `apps/mobile/src/lib/addByRss/parsePath.ts`, returning `'server' | 'device'` from the account
  snapshot (null account, no membership, or lapsed membership means `'device'`; a valid Trial or
  Premium membership means `'server'`). Every caller that picks between the server parse and the
  device parse goes through it.

## Areas

### Area A — `podverse-partytime` React Native entry point and server adoption

- **Rows:** R9, R10
- **Starts from:** the sibling checkout `../partytime` (package `podverse-partytime` 5.1.0,
  remote `podverse/partytime`, `src/config.ts`, `src/logger.ts`, `src/shared.ts`,
  `src/parser/`); `packages/parser/src/lib/rss/addByRSS.ts` and every
  `packages/parser/src/lib/rss/**` import of `podverse-partytime`; `packages/parser/package.json`.
- **Depends on:** none.
- **Shares files with:** area B (`packages/parser/src/lib/rss/addByRSS.ts` and
  `packages/parser/src/lib/rss/hash/rawFeed.ts` if B moves pure helpers into a mobile-safe
  package; root `package-lock.json`).
- **Notes:** the partytime change lives in the sibling checkout and is built there. This run links
  it with `file:../../../partytime` from `packages/parser` and `apps/mobile`. Publishing, and
  replacing that link with a version range, waits until someone commits the dependency for other
  machines.
- **Plan number block:** 10–19

### Area B — On-device fetch and parse engine

- **Rows:** R3, R6, R11, R12, R18
- **Starts from:** `packages/parser/src/lib/rss/addByRSS.ts` (conditional GET, raw-feed hash,
  Basic auth, per-host delay), `addByRSSRedirectAuth.ts` (`buildCredentialScopedBeforeRedirect`),
  `resolveCredentialScope` in `@podverse/helpers`, `apps/mobile/src/lib/addByRss/credentials.ts`,
  `mediaAuth.ts`, `apps/mobile/src/data/repositories/addByRssCredentialStore.ts`,
  `convertParsedRSSFeedToCompat` in `@podverse/parser-mapping`. Owns the device parse function
  (§ Seams), manual-redirect fetching on iOS and Android, credential storage for a signed-out
  user (the credential index is keyed by `account_id_text` today), and how hosts see phone
  requests (User-Agent, conditional GET, request pacing).
- **Depends on:** area A (the entry point it imports), area C (parse path, storage columns,
  transitions that move or clear credentials).
- **Shares files with:** area A (see above); area C (`apps/mobile/src/data/db/schema.ts`,
  `migrations.ts` if R3 stamps a parser version on stored rows; `addByRssCredentialStore.ts`
  if C's transitions clear or move signed-out credentials); `apps/mobile/package.json` and its
  lockfile (B adds the partytime dependency); i18n catalogs.
- **Plan number block:** 20–29

### Area C — Parse routing by membership, device storage, and transitions

- **Rows:** R1, R2, R5, R7, R8, R19, R20, R21, R22
- **Starts from:** `apps/mobile/src/data/repositories/addByRssRepository.ts` (`parseNow`,
  `enqueueParseRequest`, `requestRefreshAll`, `applyRefreshResult`, `upsertFeed`),
  `apps/mobile/src/sync/syncJobs.ts` (`add-by-rss-refresh`, `add-by-rss-parse`,
  `add-by-rss-listed-feeds`, which return early with no account or no membership),
  `apps/mobile/src/data/db/schema.ts` (`add_by_rss_feed`), `packages/helpers/src/lib/accessTier.ts`
  (`add_by_rss_add`, `add_by_rss_refresh`), the mobile gate call sites listed in the request's
  Orientation, `apps/mobile/src/auth/AuthProvider.tsx` (`clearSession`),
  `apps/mobile/src/sync/SyncProvider.tsx`, and the server follow list merge
  (`mergeLocalAndRemoteAddByRssFeeds`, `localFeedForServerFollow` in `domain.ts`). Owns the parse
  path decision (§ Seams), removing the membership gate on mobile add and refresh for the device
  path, refresh of device-parsed feeds, any storage columns the device path needs (for example
  the conditional cache), feed-count limits on the device path, and the four transitions.
- **Depends on:** none (calls the device parse function through § Seams).
- **Shares files with:** area B (schema, migrations, credential store); area D (`syncJobs.ts`,
  `addByRssRepository.ts` listed-feed work); `accessTier.ts` is shared with web; mobile E2E
  flows `apps/mobile/e2e/add-by-rss*.yaml` and `membership-gate.yaml`; i18n catalogs.
- **Plan number block:** 30–39

### Area D — Server-only Add by RSS work for device-parsed feeds

- **Rows:** R13, R14, R15, R16
- **Starts from:** `apps/workers/src/lib/addByRSS/fanOutAddByRSSPublisherListedFeeds.ts`,
  `apps/mobile/src/data/repositories/addByRssListedFeeds.ts`,
  `apps/mobile/src/lib/addByRss/publisherRefs.ts` and `addByRssArtistIndex.ts`,
  `apps/mobile/src/screens/home/addByRss/addByRssRemoteItems.ts` and `useAddByRssArtistAlbums.ts`,
  `packages/parser-mapping/src/addByRSS/chaptersTranscript.ts`, `publisherListedFeeds.ts` and
  `remoteItemRefs.ts`. Decides, per feature, whether a device-parsed feed gets it on the device,
  through a public read-only API route, or not at all, and plans that.
- **Depends on:** area C (shares `syncJobs.ts` and the repository's listed-feed work; uses the
  parse path decision). Calls the device parse function through § Seams.
- **Shares files with:** area C (see above); `@podverse/parser-mapping` with area B if B adds a
  mapping entry point; i18n catalogs.
- **Plan number block:** 40–49

### Area E — Copy, guidance, and docs

- **Rows:** R4, R17
- **Starts from:** the guidance and docs listed in the request's Orientation
  (`.cursor/rules/mobile-anonymous-vs-account-features.mdc`,
  `add-by-rss-client-held-credentials.mdc`, `add-by-rss-data-contracts.mdc`,
  `docs/features/ADD-BY-RSS.md`, `docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md`),
  plus the "server parse + poll only" lines in `.cursor/rules/mobile-react-native.mdc` and
  `apps/mobile/AGENTS.md`, `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md`,
  and mobile-facing catalog copy in `packages/i18n-catalog/{consumer,mobile}/originals/*.json`
  that ties Add by RSS to Premium. Records the web-versus-mobile divergence.
- **Depends on:** areas A, B, C, D (documents what their plans decided).
- **Shares files with:** i18n catalogs (areas B, C, D may add keys; E edits existing copy only).
- **Plan number block:** 50–59

### Area F — One shared Add by RSS limit, public limit endpoint, at-limit message

- **Rows:** R27, R28, R29, R30, R31
- **Starts from:** `packages/helpers/src/lib/productMembershipDefaultsFromEnv.ts`
  (`trialMaxAddByRSSFeeds`, `premiumMaxAddByRSSFeeds`), `packages/helpers/src/lib/accountTrust.ts`
  (Trial 10 and Premium 100 defaults, `max_add_by_rss_feeds` override),
  `infra/k8s/base/product-membership/source/product-membership-settings.env`,
  `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts` (the limit 403),
  `apps/api/src/routes/product/membership.ts` and `MembershipController.getResolvedProductMembership`
  (the public `GET /product/membership` catalog, which may already return both limits),
  `packages/helpers-requests/src/api/membership/membership.ts`, the consumer catalog keys
  `membership.add_by_rss_feed_limit_reached` and `membership.trial_limitations_add_by_rss_feed_limit`,
  and the support address (`getMobileConfig().contactEmail` on mobile; find web's).
- **Depends on:** none. Reads plan 32 only to find where mobile shows the limit refusal.
- **Shares files with:** area C (the mobile limit refusal call site in plan 32's files); area G
  (uses the limit reader); area E (plan 50's limit copy); i18n catalogs; `apps/api` and
  `apps/web` with nothing else in this set.
- **Also edits:** the deferred plan `.llm/plans/active/account-add-by-rss-cap-500.md` (Trial line
  and "two refusals" section), at the operator's request.
- **Plan number block:** 60–69

### Area G — Sign-up warning when device feeds exceed the limit

- **Rows:** R32, R33, R34, R35, R36, R37, R38
- **Starts from:** the mobile sign-up entry points and navigation (`apps/mobile/src/navigation/`,
  the sign-up screen and the screens that open it), `apps/mobile/src/screens/more/MoreOpmlScreen.tsx`
  (Export OPML; confirm it exports Add by RSS feeds), and `getMobileConfig().contactEmail`.
- **Depends on:** area F (limit reader), area C (signed-out feed list and the sign-up carry),
  both through § Seams for the second pass.
- **Shares files with:** area C (sign-up flow), i18n catalogs (mobile layer).
- **Plan number block:** 70–79

## Seams for the second pass

These replace or extend § Seams fixed here so the second-pass steps can plan at the same time. An
area may add fields or options; it does not rename or remove what is named here.

- **Parse path decision** (area C owns, revised): `resolveAddByRssParsePath(account, options?)`
  returns `'device'` only when there is no signed-in session (null account and
  `isAuthenticated` not true). Every signed-in session returns `'server'`, whatever the
  membership and while the account is still loading. `isDeviceParseFallbackError` is removed;
  "needs membership" and "membership expired" 403s open the membership gate, as today.
- **Pending follows are gone** (area C owns): `pending_follow_account_id_text`,
  `setPendingFollow`, `listPendingFollows` and `markFollowedFeedsPendingForAccount` leave plan 30.
  Migration 3 is not shipped yet, so plan 30 rewrites it.
- **Feeds kept by the signed-out user** (area C owns): migration 3 adds
  `signed_out_owned INTEGER NOT NULL DEFAULT 0` to `add_by_rss_feed`. A row with
  `signed_out_owned = 1` belongs to the signed-out user. While a session is signed in it is
  hidden from every list and not refreshed, fanned out, or used for chapters and transcripts.
  After sign-out it shows again and refreshes on the device. Area C names one shared read filter
  in `addByRssDevicePath.ts` or the repository, and areas B and D use it.
- **Signed-out feed list** (area C owns):
  `addByRssRepository.listSignedOutFollowedFeeds(): Promise<{ feedUrl: string; title: string | null }[]>`,
  followed `signed_out_owned = 1` rows, oldest first. Area G counts it; area C's sign-up carry
  saves from it.
- **Add by RSS limit** (area F owns): one default, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS`, read as
  `maxAddByRSSFeeds`, replaces the Trial and Premium defaults. Its value is 100, the current
  Premium default and the default in `account-add-by-rss-cap-500.md`.
  `max_add_by_rss_feeds` overrides still apply.
- **Limit readers on mobile** (area F owns): `apps/mobile/src/lib/addByRss/feedLimit.ts` exports
  `fetchAddByRssDefaultFeedLimit(): Promise<number | null>` (public endpoint, no session) and
  `fetchAccountAddByRssFeedLimit(): Promise<number | null>` (the signed-in account's limit,
  override or default). Both return null when the server cannot be reached.
- **At-limit refusal** (area F owns): a signed-in add over the limit gets a refusal with no
  renew path that says the limit was reached and to contact the support email to raise it, on
  web and mobile. Area C's plans keep routing a `limit_reached` denial to the existing limit UI
  and do not write its copy.
- **Sign-up carry** (area C owns): at the login right after a sign-up on this device, the oldest
  `listSignedOutFollowedFeeds` rows up to `fetchAccountAddByRssFeedLimit()` are saved to the new
  account and stop being `signed_out_owned`. The rest are removed from the phone, with no retry.
  Area G's screen is the only place the user accepts that removal; with no accepted screen
  (count at or under the limit) nothing is removed.
- **Credentials at sign-up** (area B owns):
  `addByRssCredentialStore.settleSignedOutCredentialsAtSignUp({ accountIdText, savedFeedUrls, removedFeedUrls })`
  moves the saved feeds' signed-out credentials to the account and deletes the removed feeds'.
  Area C's carry calls it. Sign-in to an existing account calls nothing, and sign-out clears
  only the account's credentials.

## Order

- **Wave 1:** area A (step 02), area C (step 03).
- **Wave 2:** area B (step 04, after 02 and 03), area D (step 05, after 03).
- **Wave 3:** area E (step 06, after 02–05).
- **Second pass after the first review:** the operator's answers narrow the device parse to
  signed-out users, add one shared Trial and Premium limit with a public endpoint and an
  at-limit message, and replace the sign-up and sign-in transitions. Plan 31 got D14's edit by
  hand. Wave 1: area F (step 07, new plans 60–69), area C revision (step 08, plans 30–34),
  area D revision (step 09, plans 40–44), area G (step 10, new plans 70–79). Wave 2: area B
  revision (step 11, plans 20–22, after 08 and 10). Wave 3: area E revision (step 12, plans
  50–52, after 07–11). Then a review of second-pass decisions, then Close.
- **Third pass after the second review:** the operator accepted D33–D39 and D41–D44 and changed
  D32, D40, D45 and D46. Wave 1: area F revision (step 13, plans 60–64; the limit sentence
  leaves the Trial limitations list and becomes help text on the mobile add screen), area D
  revision (step 14, plan 42; `directory_unavailable` retried with backoff), area G revision
  (step 15, plans 70–79; signed-out OPML export includes directory podcasts), areas B and C
  together (step 16, plans 22 and 34; signed-out credentials copied to the account at sign-in).
  Wave 2: area E revision (step 17, plans 50 and 52, after 13–16). Then Close.

## Decisions to review

Product choices the request did not settle, collected from each area step's final message. Each
item gives the choice made, the main alternative, and the plan that holds it.

Every decision below is settled. Where an entry differs from the operator's answers in
`00-REQUEST.md` § Review of the first planning pass and § Review of the second planning pass, the
answer wins and the plans follow it. Changed by the first review: D5, D6, D7, D8, D9, D10, D11,
D19, D20, D22, D23, D28 (narrowed to signed-out users). Changed by the second review: D32, D40,
D45, D46.

### Step 02 — area A (partytime entry point)

- **D1** (plan 10) New subpath `podverse-partytime/core` beside the root, which keeps its Node behavior, so the release is a minor version. Alternative: make the root itself React Native-safe and drop the CORS checks and env config (major version).
- **D2** (plan 10) If 5.2.0 (the uncommitted `descriptionRaw` work in `../partytime`) is still unpublished when plan 10 runs, this change ships in that release; otherwise the next minor. Alternative: always a separate release.
- **D3** (plan 10) `core` logs to `console` at `warn`, reads no environment variables, and mobile turns it off with `setPartytimeLogLevel`. Alternative: silent by default.
- **D4** (plan 11) The server keeps `core`'s console output: the same warning level pino used, but plain text instead of JSON. Alternative: route partytime logs into the monorepo logger.

### Step 03 — area C (parse routing, storage, transitions)

- **D5** (plan 30) Signed in but account not loaded yet: actions use the server path; a "needs membership" or "membership expired" 403 moves that one action to the device. Alternative: use the device until the account is known.
- **D6** (plans 30, 32) A member at the feed cap still gets the existing limit modal, not a device fallback. Alternative: add on the device and save to the account later.
- **D7** (plan 32) No feed cap on the device path. Alternative: apply the Trial cap or a separate device cap.
- **D8** (plans 30, 32, 33) Feeds added while signed into a free or lapsed account are marked pending and saved to that account once it has a valid membership. Alternative: keep them on the phone only.
- **D9** (plan 34) Sign-up on this device saves every followed device feed to the new account, oldest first, up to the cap; the rest stay on the phone and are retried on later refreshes. Alternatives: ask the user (as v4 did), or save none.
- **D10** (plan 34) Sign-in to an existing account saves nothing; device feeds stay on the phone and refresh on the device, matching the directory subscription rule. Alternatives: save them, or ask.
- **D11** (plan 34; implemented in plan 22) Credentials saved while signed out move to the account at any sign-in. Alternatives: a signed-out store that survives sign-in, or clearing them at sign-in.
- **D12** (plans 30, 33) Background refresh on the device skips feeds fetched in the last 15 minutes; pull to refresh checks all of them. Alternative: refresh on every foreground, as the server path does.
- **D13** (plan 30) Web stays gated: the shared `add_by_rss_add` / `add_by_rss_refresh` tiers stay membership-only, mobile uses them only to pick a path, and the playlist screens keep using `add_by_rss_add` as their membership check. Alternative: add mobile-specific feature keys.

### Step 04 — area B (device fetch and parse)

- **D14** (plan 21) An unreachable host returns `failed` / `network` instead of throwing; only Offline Mode (`OfflineModeEnabledError`) and the caller's abort throw. Alternative (what plan 31's text assumes): DNS errors throw too, which would let one stuck feed host park the whole sync queue.
- **D15** (plan 21) Parser fixes reach device-parsed feeds through the stored hash: the device `feedHash` starts with the app version, so after an app update each feed gets one unconditional fetch and re-parse, then normal caching resumes. Alternatives: a parser-version column in migration 4, or re-parse only when the feed content changes.
- **D16** (plan 21) The device hash is cyrb53 in plain JS, opaque and compared only on the phone. Alternatives: the shared md5 (slow pure-JS crypto shim on multi-MB feeds), or adding `expo-crypto` (native dependency, needs a rebuild).
- **D17** (plan 21) Every device request uses `redirect: 'manual'`. Alternative: manual only when credentials are attached.
- **D18** (plan 21) Host-facing behavior differs from the server on purpose: User-Agent `<brand without spaces>/<version> (<platform>)`; 30 s timeout instead of 5 s; 10 redirects instead of 21; wavlake spacing counts from that phone's last request instead of a fixed 5 s sleep; no SSRF policy, so a feed on the user's home network works. Alternative: match the server exactly.
- **D19** (plan 22) Signed-out credentials use an owner value in the existing store and move at any sign-in, to a new or existing account. Alternatives: a separate table; move only at sign-up; drop at sign-in.
- **D20** (plan 22) Sign-out still clears every credential, signed-out ones included. Alternative: keep the signed-out bucket.
- **D21** (plan 20) The fetch rules are shared through helpers and the server code is refactored to use them. Alternative: the device copies the logic.

### Step 05 — area D (server-only work for device-parsed feeds)

- **D22** (plans 40, 42) Directory lookup and resolve become public routes. Alternative: keep them signed-in only, so signed-out users see bare reference rows and a sign-in prompt.
- **D23** (plan 42) Feeds listed by guid only: the device uses stub-table matches from the lookup; a feed neither the directory nor the stub tables know stays unresolved. A deliberate gap from the server path, which asks Podcast Index live. Alternative: call resolve once per listing (rejected: up to 100 live Podcast Index calls per artist against a per-address limit).
- **D24** (plan 42) Private artist feeds: when the device parse sent credentials, the lookup is skipped, so listed album URLs never reach Podverse; albums with a URL are still fetched from their host. Alternative: send the lookup anyway.
- **D25** (plan 42) Failed lookup: keep the stored listings and store a null conditional cache, so the next refresh fetches the whole feed and plans again. Alternative: plan with no directory matches, which would turn directory albums into Add by RSS albums.
- **D26** (plan 42) Listings planned on the device get `device:<uuid>` request ids and are always parsed on the device; server ids are parsed on the device only when the parse path is `'device'`. Alternative: send device ids to the server once a user upgrades.
- **D27** (plan 42) Album credentials: the album's own stored credentials, else the artist's when credential scope allows, matching the server's rule.
- **D28** (plan 43) Chapters and transcripts choose by parse path (`'device'` fetches on the phone), so free and lapsed users' credentials also stay on the phone. Alternative: choose by sign-in only.
- **D29** (plan 42) Album-to-artist directory match unchanged; it already works signed out through the public `GET /channel/directory-match`.

### Step 06 — area E (copy, guidance, docs)

- **D30** (plan 50) The membership comparison row uses the existing free-on-mobile mark, with both columns checked. Alternatives: a mobile-only override of the shared table, or leave the row Premium-only.
- **D31** (plan 51) The password sentence branches by parse path; the shared consumer string stays, since it is still true on the website and on the mobile server parse. Alternative: one sentence describing both paths.

## Decisions to review — second pass

Product choices the request and the first review did not settle, collected from the final
messages of second-pass steps 07–12. Each item gives the choice made, the main alternative, and
the plan that holds it. Step 12 (area E revision) reported none.

### Step 07 — area F (shared Add by RSS limit, public limit endpoint, at-limit message)

- **D32** (plan 60) The Trial-limit sentence stays in the Trial limitations list, always shown, rewritten to "Add by RSS holds up to {max_feeds} feeds on Trial and on Premium." Alternative: remove the sentence and its key, since the limit is no longer Trial-specific.
- **D33** (plan 63) The at-limit dialog has an Email Support button that opens a `mailto:`, and the message states the number: "You have reached your limit of {limit} Add by RSS feeds. To have it raised, email {contactEmail}." Alternative: a dismiss-only notice that mentions the address without a button or a number.

### Step 08 — area C revision (signed-out device parse, sign-up and sign-in)

- **D34** (plan 30) A feed both the signed-out user and the account follow is one row on the phone, owned by the account. It shows and is refreshed by the server while signed in, and still shows after sign-out. Unfollowing it while signed in removes it for both. Alternative: a separate signed-out follow that survives the account unfollowing it.
- **D35** (plans 30, 34) The account's feeds stay listed after sign-out and refresh on the phone. They count toward the warning before sign-up and can be carried into a new account. Alternative: hide them until that account signs in again.
- **D36** (plan 34) Rows an earlier account left that the newly signed-in account does not follow are hidden under the new account and go to the signed-out user. Alternative: show them as local-only feeds.
- **D37** (plan 34) Feeds followed between sign-up and the first login are never removed by the carry; extras stay with the signed-out user. Area G's warning covers only the feeds that existed at sign-up. Alternative: remove them too.
- **D38** (plan 34) A new account without a valid membership at its first login gets nothing saved and nothing removed. Alternative: remove the extras anyway.

### Step 09 — area D revision (public lookup and resolve, paced resolve queue)

Step 09 named no alternatives; the ones below are the obvious opposite of each choice.

- **D39** (plans 42, 44) A tap on a row resolves right away, not through the queue; a tap that gets a 429 shows the existing rate-limit notice and does not retry. Only background resolves wait and retry. Alternative: taps also wait out the 429 and retry.
- **D40** (plan 42) An album with no match is not asked again until the artist changes: `not_found`, `directory_unavailable`, and a 400 mark the row `resolve_no_match`, and the artist's next parse replaces the row and clears the mark. Alternative: retry unmatched albums on every refresh.
- **D41** (plan 42) Background resolves are paced 500 ms apart (two calls per second), which keeps a 100-album artist under the 120-per-minute signed-out budget. Alternative: a different spacing or budget.
- **D42** (plan 40) The signed-out per-IP resolve budget lives in each API process's memory, like the existing limiters, so with several API pods a signed-out IP gets up to 120 per minute per pod. Alternative: a shared store across pods.

### Step 10 — area G (sign-up warning when device feeds exceed the limit)

- **D43** (plan 71) When the limit can't be fetched (also offline, in Offline Mode, or when the feed count fails), the screen shows a retryable error and does not open sign-up, since sign-up needs the server and skipping the warning would remove feeds without consent. Alternatives: show the warning without a number and allow Continue, or skip the warning.
- **D44** (plans 70, 71) The warning has its own Export OPML button that saves the file and opens the share sheet without leaving sign-up; More › OPML gets the same signed-out export. Alternative: a link to More › OPML that closes the sign-up sheet.
- **D45** (plan 70) A signed-out export contains only Add by RSS feeds. Alternative: look up directory feed URLs from the API so those are exported too.

### Step 11 — area B revision (credentials at sign-up, sign-in, and sign-out)

- **D46** (plan 22) When plan 34's sign-in settle makes a shared feed the account's, its signed-out credentials are not copied to the account. While signed in, the feed asks for the account's username and password on this phone; the signed-out copy is used again after sign-out. Alternative: copy the signed-out pair into the account when the feed changes hands, which adds a credential call to plan 34's settle.
