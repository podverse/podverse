**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 52 — Record on-device Add by RSS in guidance and docs

Standing guidance still says mobile Add by RSS is server parse plus poll, membership-only, and
that only a valid membership can add or refresh. Write what the code does after this set, with
no plan numbers and no paths under `.llm/plans/`.

Only a signed-out user parses on the phone. A signed-in user always uses the server parse. A
free or lapsed membership behaves as it does today. Web cannot parse a feed itself: browsers
block the cross-site fetch. That difference is intentional. Say so in each file this plan edits
that currently claims the two surfaces match.

Do not paste catalog sentences other plans in this set already write. Name the behavior. Leave
the strings to the plan that owns the key.

## Rows

R4, R17

## Runs after

none

## Files

.cursor/rules/mobile-anonymous-vs-account-features.mdc
.cursor/rules/mobile-account-scoped-data.mdc
.cursor/rules/mobile-react-native.mdc
.cursor/rules/add-by-rss-client-held-credentials.mdc
.cursor/rules/add-by-rss-data-contracts.mdc
apps/mobile/AGENTS.md
docs/features/ADD-BY-RSS.md
docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md
docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md
docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md
docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md

## Leave alone

- `packages/helpers/src/lib/accessTier.ts`. Web still gates on `add_by_rss_add` and
  `add_by_rss_refresh` at the membership tier. On mobile those keys still gate a signed-in add
  and a signed-in refresh. They do not choose the parse path. The parse path is sign-in.
- Catalog strings. Plan 50 owns the comparison-row flag and does not edit catalogs. Plan 51
  owns `features.add_by_rss.credentials_page_host_note` and leaves
  `credentials_page_device_note` as it is. Plan 60 removes
  `membership.trial_limitations_add_by_rss_feed_limit`; the Trial limitations list no longer
  states the limit. Plan 64 owns `features.add_by_rss.feed_limit_help` (help text on the mobile
  Add by RSS screen). Plan 63 owns `membership.add_by_rss_feed_limit_reached` and
  `membership.gate.email_support`. Plan 61 owns the management field label and help text.
  Plans 70 and 71 own the signed-out OPML notices and
  `authentication.signup_add_by_rss_limit.*`, including
  `settings.opml.export_description_device`, `settings.opml.export_device_empty`,
  `settings.opml.export_device_partial`, `settings.opml.export_device_offline_mode`, and
  `settings.opml.export_device_offline_mode_unavailable`. Plan 44 owns
  `features.add_by_rss.remote_item_directory_unavailable`. Record the behavior; do not copy
  those sentences into a rule or a doc.
- `docs/proposals/mobile/_master-plan_/phase-1/details/494-data-layer-add-by-rss-parser-mapping.md`.
  It describes mapping after a server parse, which the server path still does.
- `release-notes/scratchpad.md`. The behavior plans already have entries. This plan changes
  guidance only.

## Facts to write (do not soften or extend)

Parse path (`resolveAddByRssParsePath` in `apps/mobile/src/lib/addByRss/parsePath.ts`):

- No signed-in session: `'device'`. That is a null account and `isAuthenticated` not true.
- Every signed-in session: `'server'`, whatever the membership, including while the account
  snapshot has not loaded.
- There is no move from a server refusal onto the device. "Needs membership" and "membership
  expired" open the membership gate, as today. A signed-in add past the account's limit opens
  the support-email refusal (limit number, no renew path). Do not write that sentence here.
- Signed-out adds have no feed-count limit.
- A signed-in free or lapsed account behaves as today. Adding is blocked behind the membership
  prompt. Existing feeds stay playable and stop refreshing. There is no device parse and no
  saved-for-later state for them.

Device parse (`parseAddByRssFeedOnDevice`): no request to the Podverse API for the feed body.
Only a signed-out user calls it. Import `podverse-partytime/core` only. Do not import the
package root, `podverse-partytime/dist`, or `@podverse/parser`. Map with
`@podverse/parser-mapping`. At startup the app sets the partytime log to silent; `core`
otherwise logs to the console at warn. The device and the server share the failure, redirect
credential, host-spacing, and raw-body normalization rules in `@podverse/helpers`.

Host-facing, on purpose, only on the device path:

- The feed host sees the phone's IP address and the User-Agent
  `<app name with spaces removed>/<app version> (<ios|android>)`.
- 30 second deadline, at most 10 redirects, manual redirects so a password is re-checked on
  every hop.
- wavlake.com requests from one phone are at least 5 seconds apart, counted from that phone's
  previous request.
- No server-side private-address block, so a feed on the home network works on the phone and
  is still refused by the Podverse servers.
- `device_feed_hash` is an opaque string that starts with the app version. It is a device hash,
  compared only on that phone, never with the server's md5 hash. After an app update each
  device-parsed feed is fetched once without conditional headers, then conditional requests
  resume.
- While anyone is signed in, the signed-out user's feeds are not parsed.

Storage on `add_by_rss_feed` (SQLite migration 3): `device_etag`, `device_last_modified`,
`device_feed_hash`, `device_checked_at`, `signed_out_owned`, `followed_at`. The server path
does not read or write the four `device_*` columns. `signed_out_owned = 1` means the signed-out
user of this phone follows the feed and no signed-in account has claimed it. While a session is
signed in, that row is hidden from every list and is not refreshed, fanned out, or used for
chapters and transcripts. After sign-out it shows again and refreshes on the phone. A feed both
the signed-out user and the account follow belongs to the account (`signed_out_owned = 0`): it
shows while signed in, the server refreshes it, and it still shows after sign-out.
`followed_at` is when this phone last started following the feed. There is no pending-follow
column.

One shared limit, recorded as behavior only. Do not paste the mobile help sentence or the
removed Trial limitations sentence.

- Trial and Premium share one default, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` (100), read as
  `maxAddByRSSFeeds`. A per-account `max_add_by_rss_feeds` override still wins. Do not describe
  two defaults.
- The public `GET /product/membership` returns that default. Authenticated
  `GET /account/add-by-rss/feed-limit` returns the signed-in account's own limit. The phone
  reads both, so a limit change needs no app release.
- The limit is not a Trial limitations sentence. The key
  `membership.trial_limitations_add_by_rss_feed_limit` is removed. The web membership page, the
  mobile membership screen, and `GET /product/membership/comparison` do not state the limit.
- On mobile the limit is help text on the Add by RSS library screen (`AddByRssRootScreen`),
  under the Add Feed action band, catalog key `features.add_by_rss.feed_limit_help`. It shows
  only while signed in, and only when the account's own limit is known. Signed out, the line
  is hidden, because signed-out adds have no limit. A free or lapsed account does not see it.
  Web's Add by RSS pages do not show this line. A web user learns the number from the at-limit
  refusal. That difference is intentional.
- A signed-in save past the limit is refused. The refusal names the limit and points at the
  support email. It has no renew path. The manual-refresh hourly limit is unchanged.

Transitions:

- Before the sign-up form, when the phone's followed Add by RSS feeds are over the public
  default limit, one screen states the limit, warns that feeds over it may be lost, recommends
  Export OPML, has a show/hide control with a longer explanation, names support, and requires a
  checkbox before Continue. When the limit cannot be loaded, that screen retries and does not
  open sign-up. At or under the limit, sign-up opens directly. Web has no such screen: web has
  no signed-out Add by RSS library. That difference is intentional.
- At the first login after a sign-up on this phone, the oldest followed device feeds, up to the
  new account's limit, are saved to the account and stop being the signed-out user's. The rest
  that were followed at or before the account was created are removed from the phone, and
  nothing retries them. A feed followed after the account was created stays the signed-out
  user's. When the count is at or under the limit, nothing is removed. When the account's limit
  cannot be loaded, that run removes nothing and tries again on a later refresh.
- Sign-in to an existing account pushes nothing. Feeds the account does not have stay on the
  phone, hidden and not refreshed while signed in. After sign-out they show again and refresh
  on the phone.
- Sign-out keeps the signed-out user's feeds. Feeds the account followed stay on the phone and
  show too, because a signed-out session lists every followed row.
- A lapse and a renewal stay as they are today: the membership gate blocks add and refresh
  while lapsed or free, and a valid membership resumes the server refresh. Nothing is parsed on
  the phone in between.

Credentials:

- While signed out, mobile stores the username and password under the owner `signed-out-device`,
  still keyed by the canonical feed URL.
- At sign-up, the credentials of feeds saved to the account move to the account, and the
  credentials of removed feeds are deleted.
- At sign-in to an existing account, nothing moves except one copy. For a feed both the
  signed-out user and the account follow, the signed-out username and password are copied to
  the account's entry on this phone unless the account already has a pair there. The
  signed-out copy stays and is used again after sign-out. The store method is
  `copySignedOutCredentialsAtSignIn`; the pure rule is
  `copySignedOutAddByRssCredentialsToAccount`. The copy is SecureStore to SecureStore on this
  phone. Nothing is sent to Podverse. A feed that stays the signed-out user's gets no
  credential change.
- Sign-out clears only the account's credentials and keeps the signed-out owner's.
- On the device parse, the phone sends the username and password only to the feed host,
  re-checked on every redirect hop, and does not send them to the Podverse API. The transit
  envelope is the server parse.

Signed-out Export OPML, from the sign-up warning and from More › OPML, is built on the phone.
It includes the followed Add by RSS feeds and the directory podcasts. Each directory feed URL
is looked up from the public `GET /channel/:idOrIdText` route by `id_text`. Directory outlines
come first, matching the server export. The file never contains a password. When some lookups
fail, the file keeps what was found and the message says how many directory podcasts were left
out. In Offline Mode the phone makes no lookups: it exports the Add by RSS feeds and the
message gives the directory count left out; with no Add by RSS feeds it writes no file and
asks the user to turn Offline Mode off. If the connection drops mid-export, it stops at the
first unreachable answer and saves what it has, counting the rest as left out. Signed in,
export still downloads the account's file from the server. Web has no signed-out export. That
difference is intentional. Do not paste the OPML notice sentences.

What a signed-out device parse does with work that used to be server-only. A signed-in user
keeps the server path for all of this.

- Listed albums, podroll, and remote items work signed out. When the device parse sent
  credentials, the artist's references are not sent for lookup or resolve. Albums that have a
  URL are still fetched from their host.
- Chapters and transcripts follow sign-in, not membership. A signed-in user always uses the
  API. A signed-out user fetches the files on the phone. A feed hidden in the signed-in session
  returns nothing and makes no request.
- `POST /account/add-by-rss/remote-item/lookup` and `/resolve` answer without a session.
  Lookup has no rate limit. The device sends at most 100 references per lookup request.
  Resolve for signed-out callers uses `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE`,
  default 120 per IP address. Signed-in callers keep
  `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per account.
- A channel-level album named only by guid, which neither the directory nor the stub tables
  know, is resolved by a background job that calls resolve one guid at a time, waits out a 429,
  and retries. Rows fill in as answers arrive. `not_found` and a 400 mark that guid
  `resolve_no_match` until the artist feed changes. The artist's next listing pass replaces the
  row and clears the mark. `directory_unavailable` is temporary: the row stays unresolved and
  the guid is retried later with backoff, in memory only, cleared when the app restarts. After each such
  answer the next try waits 1, 2, 4, 8, 16, then 30 minutes. At most seven calls per guid per
  app launch; after that the guid is not asked again until the next launch. Nothing schedules
  a timer. The next signed-out refresh (app start, foreground, connectivity restored, or pull)
  or the listed-feed job asks when the delay has passed. A settled answer clears the retry
  entry. A tap on a podroll or remote-item row stays one interactive resolve; a 429 there
  shows the existing notice and does not retry on its own. A tap that gets
  `directory_unavailable` shows the existing directory-unavailable notice, stores nothing, and
  can be tapped again. Do not paste that notice.
- A private album's publisher pointer still uses the public directory-match route, which
  already answers signed out.

## 1. `.cursor/rules/mobile-anonymous-vs-account-features.mdc`

Replace the Add by RSS row in the tier table (today: Membership, "Requires server-side feed
parsing") with two rows:

- **Add by RSS on mobile, signed out** — Anonymous — The phone parses the feed. No feed limit.
  No server job.
- **Add by RSS while signed in, and Add by RSS on the website** — Membership — Server parse. A
  free or lapsed membership cannot add, and existing feeds stop refreshing, as today. The
  website has no on-device parse, because a browser cannot fetch another site's RSS.

Keep the "Current lapsed behavior for add-by-RSS" sentence. It is still true for a signed-in
lapsed membership. After it, add the signed-out behavior from the Facts section: the phone
parses and refreshes with no feed limit, and those feeds are hidden and not refreshed while
someone is signed in. Add that the shared limit is help text on the mobile Add by RSS screen
for a signed-in user whose limit is known, and that the Trial limitations list does not state
it. Do not paste the help sentence.

After "Signing out discards nothing local", add that feeds the signed-out user followed show
again after sign-out and refresh on the phone, and that sign-out clears the account's Add by
RSS credentials and keeps the signed-out owner's. Do not change the directory-subscription
paragraph above it.

Do not change the gate-rule quote at the top. The two rows are how Add by RSS meets it.

## 2. `.cursor/rules/mobile-account-scoped-data.mdc`

In the classification table, the account-data row lists add-by-RSS feed credentials
(SecureStore + `add_by_rss_credential_index`) as cleared. Split that:

- An account's Add by RSS credentials are account data and are cleared on sign-out and account
  deletion.
- Credentials stored for the signed-out user (owner `signed-out-device`) are device data and
  are kept through sign-in and sign-out.

The device-data row already lists add-by-RSS feeds as kept. Add that a feed the signed-out user
owns is hidden while signed in and shown again after sign-out. Do not say every credential is
cleared.

## 3. `.cursor/rules/mobile-react-native.mdc`

Replace the Add-by-RSS bullet (search `server parse + poll only`) with: a signed-in user uses
server parse and poll; a signed-out user parses on the phone through `podverse-partytime/core`
only; map with `@podverse/parser-mapping`; never import `@podverse/parser`, the partytime
package root, or `podverse-partytime/dist`.

## 4. `.cursor/rules/add-by-rss-client-held-credentials.mdc`

Under Always, extend the keying bullet with the Credentials facts: the signed-out owner, what
moves at sign-up, the sign-in copy for a feed both follow (copied to the account on this phone
unless that account already has a pair; the signed-out copy stays), and that sign-out clears
only the account's entries. Name `copySignedOutCredentialsAtSignIn` and
`copySignedOutAddByRssCredentialsToAccount`. The feed rows stay; they are device data.

Add a bullet: on the device parse, the phone sends the username and password only to the feed
host, re-checked on every redirect hop, and does not send them to the Podverse API. The
transit envelope in this rule is the server parse.

Under the "Change web and mobile together" bullet, add one sentence: the device parse exists
only on mobile, and only while signed out. The website keeps the server parse because a browser
cannot fetch the feed host. That difference is intentional. A credential rule that is about the
server parse still changes both surfaces.

## 5. `.cursor/rules/add-by-rss-data-contracts.mdc`

In the mobile-record step, name the six columns from the Facts section and the rule that
`device_feed_hash` is never compared with a server hash. State that a device parse does not
produce an `AddByRSSParseCacheEntry`; it stores the same `AddByRSSMappedFeed` in
`mapped_feed_json`. The server-record step stays the contract for the server parse. Do not add
a column for the `directory_unavailable` retry time; it lives in memory and a restart clears
it. `resolve_no_match` is a reason on the existing listing row, not a new column.

## 6. `apps/mobile/AGENTS.md`

Replace the Add-by-RSS bullet (search `server-side parse + poll only`) with the same import
and path rule as § 3.

In the allowlist table, add a row: allowed `podverse-partytime/core`; forbidden
`podverse-partytime` package root and `podverse-partytime/dist`. Leave `@podverse/parser` in
the forbidden column.

## 7. `docs/features/ADD-BY-RSS.md`

Rewrite the opening paragraph so workers parse feeds for every signed-in user, and mobile
signed out parses on the phone into the same library, with no feed limit. The website always
uses the workers, because a browser cannot fetch the feed. Say that difference is intentional.

Add a section `## Where a feed is parsed` after that paragraph, containing the Facts section
above in prose (path, host-facing differences, storage columns, the shared limit as behavior,
transitions, signed-out export, and the server-only work the phone now does while signed out).
Do not paste catalog sentences. Keep the existing Basic Auth, artist-feed, and media sections
as the server-path description. At the start of `### Parse path (transit envelope)`, add one
sentence: those steps are the server parse; the device parse does not send the username and
password to the API.

In `### Where credentials live`, add the signed-out owner and the sign-up, sign-in, and
sign-out rules from the Facts section. The table's Mobile scope stays "account or signed-out
owner, plus canonical feed URL".

In `### Testing`, add the signed-out Maestro flows this set adds, by filename only:
`add-by-rss-anonymous.yaml`, `add-by-rss-device-credentials.yaml`,
`add-by-rss-sign-in.yaml`, `add-by-rss-anonymous-artist.yaml`,
`add-by-rss-anonymous-sections.yaml`, `add-by-rss-anonymous-podroll.yaml`,
`signup-add-by-rss-limit.yaml`, `opml-signed-out.yaml`. Do not remove the flows already
listed. When writing the shared-limit, export, resolve, and credential paragraphs, use the
Facts section and do not paste catalog sentences.

## 8. `docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md`

This file is a closed detail. Correct the sentences that are now false. Do not change
**Status:** done, and do not restage the work as unfinished.

- In the tier summary, stop listing add-by-RSS as membership with no qualifier. Point at the
  two rows this plan writes into `mobile-anonymous-vs-account-features`.
- Keep the lapsed add-by-RSS paragraph (feeds stop refreshing, adding is blocked). It describes
  a signed-in lapsed membership. Add that a signed-out user parses and refreshes on the phone
  with no feed limit, and that a free or lapsed account does not.
- The sentence that Trial has tighter feed limits than Premium is false for Add by RSS. Trial
  and Premium share one Add by RSS limit. Refresh caps stay per tier. The Trial limitations
  list does not state the Add by RSS limit. On mobile that limit is help text on the Add by
  RSS screen for a signed-in user whose limit is known. Do not paste the help sentence.
- Replace the sentence that says mobile has no manual refresh and that a future control must
  call `evaluateFeature('add_by_rss_refresh')`. Mobile has Check for Updates. Signed in, it
  uses the server parse and the membership check. Signed out, it refreshes on the phone. The
  playlist screens still evaluate `add_by_rss_add` as their membership check.
- In acceptance criteria, keep the lapsed-member bullet that they still see previously added
  feeds, and state they cannot add or refresh. Add that a signed-out user can add and refresh
  Add by RSS feeds on the phone.

## 9. `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md`

- Parity-matrix Add-by-RSS row: web stays server parse, poll, `@podverse/parser-mapping`, and
  IndexedDB. Mobile uses that same server path while signed in, and parses on the phone through
  `podverse-partytime/core` while signed out, into the local database. Say the website
  difference is intentional (browsers block the feed fetch).
- Section 4 allowlist: same new row as `apps/mobile/AGENTS.md`. Keep `@podverse/parser`
  forbidden.
- Replace § 4.1's opening ("Neither web nor mobile parses RSS XML in the client") with the
  split above. Keep the server steps as what the server path does. Keep the warning not to
  import `@podverse/parser`, and add the `podverse-partytime/core` limit. The "today: slim
  `items[0]` only" cell is stale; mobile stores the mapped bundle. Say that, and do not
  describe a removed slim mapping.
- Replace consistency rule 6 with the same split. Do not tell the reader to never parse XML
  in the app. Signed-in mobile and the website still do not.

## 10. `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md`

Replace the two Add-by-RSS bullets that say neither client parses XML (the summary bullet
near the top, and item 2 under "Consistency rules (data + add-by-RSS)") with the same split
as § 9. Point the longer write-up at `DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md` § 4.1
rather than repeating the host-facing list.

## 11. `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md`

In § 12, keep the server parse and poll as what web and a signed-in phone do. Add that a
signed-out phone parses through `podverse-partytime/core` and still maps with
`@podverse/parser-mapping` into the local database. Keep "never import `@podverse/parser`" and
"do not invent a second type model".

In the LLM pitfalls table, change the Add-by-RSS row so the mistake is importing
`@podverse/parser`, inventing a second type model, or parsing XML while signed in. The correct
approach is server parse while signed in, `podverse-partytime/core` while signed out, and
`@podverse/parser-mapping` either way.

## Tests

none

## Release scratchpad

none
