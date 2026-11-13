# Add-by-RSS

Add-by-RSS lets users follow RSS feeds (podcasts, music) that are not in the main directory.
Workers parse feeds for every signed-in user. Those feeds stay in each device's add-by-RSS
library, and the account's follow list syncs which feeds a user follows across devices. A
signed-out user on mobile parses the feed on the phone into the same library, with no feed limit.
The website always uses the workers, because a browser cannot fetch the feed. That difference is
intentional. On mobile, that library is My Library → Add by RSS (chips for podcasts, episodes,
artists, albums, and tracks; plus to add). Mobile Home lists those feeds beside directory
follows. Home shows no Needs username and password section; feeds still waiting on a username and
password stay in the Add by RSS library. Web Subscribed (`/`) does the same with this browser's
feeds, and the web library is one page, `/add-by-rss`, with the same chips. CarPlay and Android
Auto keep add-by-RSS follows in the native library index.

## Where a feed is parsed

Only a signed-out user parses on the phone. A signed-in user always uses the server parse, whatever
the membership, including while the account snapshot has not loaded. `resolveAddByRssParsePath`
(`apps/mobile/src/lib/addByRss/parsePath.ts`) returns `'device'` when there is no signed-in session
(a null account and `isAuthenticated` not true) and `'server'` for every signed-in session. There
is no move from a server refusal onto the device. "Needs membership" and "membership expired" open
the membership gate, as today. Signed-out adds have no feed-count limit. A signed-in free or lapsed
account behaves as today: adding is blocked behind the membership prompt, existing feeds stay
playable and stop refreshing, and there is no device parse and no saved-for-later state for them.

`parseAddByRssFeedOnDevice` does not request the feed body from the Podverse API. Only a signed-out
user calls it. Import `podverse-partytime/core` only. Do not import the package root,
`podverse-partytime/dist`, or `@podverse/parser`. Map with `@podverse/parser-mapping`. At startup
the app sets the partytime log to silent; `core` otherwise logs to the console at warn. The device
and the server share the failure, redirect credential, host-spacing, and raw-body normalization
rules in `@podverse/helpers`.

The website cannot parse a feed itself. Browsers block the cross-site fetch, so the website always
uses the workers. That difference is intentional.

### What the feed host sees on the device path

These differences are on purpose, and only on the device path:

- The feed host sees the phone's IP address and the User-Agent
  `<app name with spaces removed>/<app version> (<ios|android>)`.
- The deadline is 30 seconds, with at most 10 redirects. Redirects are manual so a password is
  re-checked on every hop.
- wavlake.com requests from one phone are at least 5 seconds apart, counted from that phone's
  previous request.
- There is no server-side private-address block, so a feed on the home network works on the phone
  and is still refused by the Podverse servers.
- `device_feed_hash` is an opaque string that starts with the app version. It is a device hash,
  compared only on that phone, never with the server's md5 hash. After an app update each
  device-parsed feed is fetched once without conditional headers, then conditional requests resume.
- While anyone is signed in, the signed-out user's feeds are not parsed.

### Storage on the phone

SQLite `add_by_rss_feed` (migration 3) stores `device_etag`, `device_last_modified`,
`device_feed_hash`, `device_checked_at`, `signed_out_owned`, and `followed_at`. The server path
does not read or write the four `device_*` columns. `signed_out_owned = 1` means the signed-out
user of this phone follows the feed and no signed-in account has claimed it. While a session is
signed in, that row is hidden from every list and is not refreshed, fanned out, or used for
chapters and transcripts. After sign-out it shows again and refreshes on the phone. A feed both
the signed-out user and the account follow belongs to the account (`signed_out_owned = 0`): it
shows while signed in, the server refreshes it, and it still shows after sign-out. `followed_at`
is when this phone last started following the feed. There is no pending-follow column.

A device parse does not produce an `AddByRSSParseCacheEntry`. It stores the same
`AddByRSSMappedFeed` in `mapped_feed_json`.

### One shared limit

Trial and Premium share one default, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` (100), read as
`maxAddByRSSFeeds`. A per-account `max_add_by_rss_feeds` override still wins.

The public `GET /product/membership` returns that default. Authenticated
`GET /account/add-by-rss/feed-limit` returns the signed-in account's own limit. The phone reads
both, so a limit change needs no app release.

The limit is not a Trial limitations sentence. The key
`membership.trial_limitations_add_by_rss_feed_limit` is removed. The web membership page, the
mobile membership screen, and `GET /product/membership/comparison` do not state the limit.

On mobile the limit is help text on the Add by RSS library screen (`AddByRssRootScreen`), under
the Add Feed action band, catalog key `features.add_by_rss.feed_limit_help`. It shows only while
signed in, and only when the account's own limit is known. Signed out, the line is hidden, because
signed-out adds have no limit. A free or lapsed account does not see it. Web's Add by RSS pages do
not show this line. A web user learns the number from the at-limit refusal. That difference is
intentional.

A signed-in save past the limit is refused. The refusal names the limit and points at the support
email. It has no renew path. The manual-refresh hourly limit is unchanged.

### Sign-up, sign-in, sign-out, and a lapse

Before the sign-up form, when the phone's followed Add by RSS feeds are over the public default
limit, one screen states the limit, warns that feeds over it may be lost, recommends Export OPML,
has a show/hide control with a longer explanation, names support, and requires a checkbox before
Continue. When the limit cannot be loaded, that screen retries and does not open sign-up. At or
under the limit, sign-up opens directly. Web has no such screen: web has no signed-out Add by RSS
library. That difference is intentional.

At the first login after a sign-up on this phone, the oldest followed device feeds, up to the new
account's limit, are saved to the account and stop being the signed-out user's. The rest that were
followed at or before the account was created are removed from the phone, and nothing retries them.
A feed followed after the account was created stays the signed-out user's. When the count is at or
under the limit, nothing is removed. When the account's limit cannot be loaded, that run removes
nothing and tries again on a later refresh.

Sign-in to an existing account pushes nothing. Feeds the account does not have stay on the phone,
hidden and not refreshed while signed in. After sign-out they show again and refresh on the phone.

Sign-out keeps the signed-out user's feeds. Feeds the account followed stay on the phone and show
too, because a signed-out session lists every followed row.

A lapse and a renewal stay as they are today: the membership gate blocks add and refresh while
lapsed or free, and a valid membership resumes the server refresh. Nothing is parsed on the phone
in between.

### Credentials while signed out

While signed out, mobile stores the username and password under the owner `signed-out-device`,
still keyed by the canonical feed URL. At sign-up, the credentials of feeds saved to the account
move to the account, and the credentials of removed feeds are deleted. At sign-in to an existing
account, nothing moves except one copy. For a feed both the signed-out user and the account follow,
the signed-out username and password are copied to the account's entry on this phone unless the
account already has a pair there. The store method is `copySignedOutCredentialsAtSignIn`; the pure
rule is `copySignedOutAddByRssCredentialsToAccount`. The signed-out copy stays and is used again
after sign-out. The copy is SecureStore to SecureStore on this phone. Nothing is sent to Podverse.
A feed that stays the signed-out user's gets no credential change. Sign-out clears only the
account's credentials and keeps the signed-out owner's. On the device parse, the phone sends the
username and password only to the feed host, re-checked on every redirect hop, and does not send
them to the Podverse API. The transit envelope is the server parse.

### Signed-out Export OPML

Signed-out Export OPML, from the sign-up warning and from More › OPML, is built on the phone. It
includes the followed Add by RSS feeds and the directory podcasts. Each directory feed URL is
looked up from the public `GET /channel/:idOrIdText` route by `id_text`. Directory outlines come
first, matching the server export. The file never contains a password. When some lookups fail, the
file keeps what was found and the message says how many directory podcasts were left out. In
Offline Mode the phone makes no lookups: it exports the Add by RSS feeds and the message gives the
directory count left out; with no Add by RSS feeds it writes no file and asks the user to turn
Offline Mode off. If the connection drops mid-export, it stops at the first unreachable answer and
saves what it has, counting the rest as left out. Signed in, export still downloads the account's
file from the server. Web has no signed-out export. That difference is intentional.

### Listed feeds, chapters, and resolve while signed out

A signed-in user keeps the server path for all of this.

Listed albums, podroll, and remote items work signed out. When the device parse sent credentials,
the artist's references are not sent for lookup or resolve. Albums that have a URL are still
fetched from their host.

Chapters and transcripts follow sign-in, not membership. A signed-in user always uses the API. A
signed-out user fetches the files on the phone. A feed hidden in the signed-in session returns
nothing and makes no request.

`POST /account/add-by-rss/remote-item/lookup` and `/resolve` answer without a session. Lookup has
no rate limit. The device sends at most 100 references per lookup request. Resolve for signed-out
callers uses `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE`, default 120 per IP
address. Signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per
account.

A channel-level album named only by guid, which neither the directory nor the stub tables know, is
resolved by a background job that calls resolve one guid at a time, waits out a 429, and retries.
Rows fill in as answers arrive. `not_found` and a 400 mark that guid `resolve_no_match` until the
artist feed changes. The artist's next listing pass replaces the row and clears the mark.
`directory_unavailable` is temporary: the row stays unresolved and the guid is retried later with
backoff, in memory only, cleared when the app restarts. After each such answer the next try waits
1, 2, 4, 8, 16, then 30 minutes. At most seven calls per guid per app launch; after that the guid
is not asked again until the next launch. Nothing schedules a timer. The next signed-out refresh
(app start, foreground, connectivity restored, or pull) or the listed-feed job asks when the delay
has passed. A settled answer clears the retry entry. A tap on a podroll or remote-item row stays
one interactive resolve; a 429 there shows the existing notice and does not retry on its own. A
tap that gets `directory_unavailable` shows the existing directory-unavailable notice, stores
nothing, and can be tapped again.

A private album's publisher pointer still uses the public directory-match route, which already
answers signed out.

## Basic Auth (private feeds)

Feeds behind HTTP Basic Auth are supported. **The server never stores the username or password.** Each device keeps them in its own secure storage and sends them only with the requests that need them. The follow row (`account_following_add_by_rss_channel`) carries a `requires_credentials` flag instead, so another device knows to ask the user before it can refresh the feed.

The durable constraints live in [`add-by-rss-client-held-credentials`](/.cursor/rules/add-by-rss-client-held-credentials.mdc).

### Where credentials live

| Surface | Store                                                                                                                                                                         | Scope                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Web     | IndexedDB database `add-by-rss-credentials`, values AES-GCM encrypted with a non-extractable per-account WebCrypto key (`apps/web/src/utils/addByRSS/credentialStore.ts`)     | Account + canonical feed URL                         |
| Mobile  | SecureStore, with an `add_by_rss_credential_index` table listing which feeds have an entry (`apps/mobile/src/data/repositories/addByRssCredentialStore.ts`)                   | account or signed-out owner, plus canonical feed URL |
| Server  | Nothing. Postgres keeps `requires_credentials` only; Valkey parse-cache entries keep `failureReason`, `httpStatus`, `authChallenge`, and `credentialsState`, never the secret | —                                                    |

While signed out, mobile stores the username and password under the owner `signed-out-device`,
still keyed by the canonical feed URL. At sign-up, the credentials of feeds saved to the account
move to the account, and the credentials of removed feeds are deleted. At sign-in to an existing
account, nothing moves except one copy. For a feed both the signed-out user and the account follow,
`copySignedOutCredentialsAtSignIn` copies the signed-out username and password to the account's
entry on this phone unless the account already has a pair there. The pure rule is
`copySignedOutAddByRssCredentialsToAccount`. The signed-out copy stays and is used again after
sign-out. The copy is SecureStore to SecureStore on this phone. Nothing is sent to Podverse. A
feed that stays the signed-out user's gets no credential change. Sign-out clears only the account's
credentials and keeps the signed-out owner's. Deleting the account clears that account's
credentials. The feed rows stay; they are device data. On the device parse, the phone sends the
username and password only to the feed host, re-checked on every redirect hop, and does not send
them to the Podverse API.

A `user:pass@` pasted into a feed URL is split into the username and password fields on the client and again in the API. Stored feed URLs never carry userinfo, and credentials are keyed by the canonical URL (`canonicalAddByRSSFeedUrl` in `@podverse/helpers-validation`).

The Add control stays disabled until the URL is a valid http(s) feed URL. When the username and password toggle is on, it also requires both fields non-empty (`canSubmitAddByRssFeed` in `@podverse/helpers-validation`). The credentials save screen uses the same length rules (`canSubmitAddByRssCredentials`).

### Parse path (transit envelope)

These steps are the server parse. The device parse does not send the username and password to the
API.

1. The client sends `basic_auth_username` / `basic_auth_password` with `POST /account/add-by-rss/parse`, or `credentials_by_url` with `POST /account/add-by-rss/parse/all`.
2. The API seals them into an AES-256-GCM envelope (`sealAddByRssCredentialsForParse` in `apps/api/src/lib/addByRSSCredentials.ts`, built on `packages/helpers-backend/src/addByRssCredentialsTransit.ts`). The envelope expires after **15 minutes** and its associated data binds it to `accountId | requestId | feedUrl`, so a copied envelope cannot be replayed against another request or feed. The queue message carries only the envelope; its dedupe id excludes it. When the feed is an artist feed, the worker seals the same way for each listed album in scope (see [Artist feeds](#artist-feeds)).
3. The worker opens the envelope in memory, checks the feed URL's scope, and fetches the feed with the Basic Auth header.
4. The parse result records `failureReason` / `credentialsState` for the client: `credentials_required`, `credentials_rejected`, `credentials_withheld_other_domain`, `credentials_withheld_insecure`, or `credentials_envelope_invalid`.

A flagged feed with no credentials in a refresh-all is not queued; it reports `credentials_required`.

**Chapters and transcripts** (`POST /account/add-by-rss/chapters-transcript`): the client sends the credentials together with `feedUrl`; the API applies them only to in-scope URLs and never stores them.

### Artist feeds

An Add by RSS parse whose resource type is `artists` (a publisher feed listing music albums) also resolves every feed the artist lists, for that member only. Nothing it does reaches the public directory: no directory parse, no feed, channel, or follow rows, no verified publisher links.

- **Directory albums** (matched by guid, then feed URL, through `ChannelAddByRSSDirectoryMatchService`) are linked to the directory channel and not fetched.
- **Other albums** are parsed as their own Add by RSS requests. Each gets a `queued` parse entry and its own message on `add-by-rss-background` before the artist entry is written, so every request id the client reads already has an entry. These messages skip broker dedupe, because Add by RSS dedupe keys on the feed URL alone and would drop a second member's album.
- The artist's `parsed` entry carries `publisherListedFeeds`: directory links, album request ids, or why a listed feed was skipped. Each album's entry carries `publisherRequestId`, the artist parse's id. An album message never fans out, even when the album is itself a publisher feed.
- At most 100 listed feeds per artist (`ADD_BY_RSS_PUBLISHER_LISTED_FEEDS_MAX`); the rest are dropped and logged as a count. Feeds named only by item-level references (track credits) are not fetched; they report `item_references_only`.
- A channel-level reference with no feed URL is looked up on Podcast Index by its guid, but only when the artist feed was fetched without credentials, so a private feed's references never leave Podverse. A failed or empty lookup reports `no_feed_url`.
- A `not_modified` artist parse has no body to read and returns no list; the client keeps the list it stored.
- **Credentials** go only to album URLs `resolveCredentialScope` allows from the artist feed's URL. The worker seals a new envelope for each such album, bound to that album's `accountId | requestId | feedUrl`, with the standard 15-minute lifetime. An album out of scope is fetched without credentials and its message carries `credentialsWithheld`, so its entry reports `withheld_other_domain` or `withheld_insecure`, and a private album there lands in Needs username and password.
- A fan-out failure never fails the artist parse: the artist entry is written `parsed` without `publisherListedFeeds`, and the error is logged with the feed host only.

### `requires_credentials`

- The client sets it when a feed is added with credentials.
- The worker sets it when a parse without credentials gets a Basic `401`.
- The worker clears it when a parse without credentials succeeds.
- The worker leaves it set when credentials were sent and rejected (`401` / `403`).

### Scope rules

Every surface uses `resolveCredentialScope` from `@podverse/helpers`:

- Credentials go only to hosts on the feed's registrable domain (eTLD+1 via `tldts`, private suffixes included). Subdomains are in scope; a different registrable domain is not.
- IP addresses and `localhost` must match the feed's host exactly.
- HTTPS only. Local development (`NODE_ENV=development`) and E2E fixtures (`PODVERSE_E2E_FIXTURES=1`) allow plain HTTP on the API and workers; mobile uses `EXPO_PUBLIC_MOBILE_ADD_BY_RSS_ALLOW_INSECURE_CREDENTIALS=1` or its E2E build.
- **Redirects:** the `Authorization` header is dropped on the first hop that leaves the scope or downgrades to HTTP, and stays dropped.
- Media on a different registrable domain from the feed is **out of scope** on every surface: it is requested without credentials, and a failure is logged with the withheld reason.

### Media, downloads, and artwork

- **Web:** always requests the plain enclosure URL. A media element cannot attach Basic Auth, and there is **no media proxy**. When a flagged feed's media fails, the player explains why (`add_by_rss.media_needs_credentials`, or `add_by_rss.media_other_domain` when the host is out of scope) and points to the mobile app. The console log carries hosts only.
- **Mobile playback:** the native engine answers an HTTP Basic **challenge** only from an in-scope host (iOS `AVAssetResourceLoaderDelegate`, Android OkHttp `Authenticator`); nothing is sent before a challenge, so a redirect elsewhere never receives the credential. A `401` / `403` is logged as `add_by_rss_credentials_required`, `add_by_rss_credentials_rejected`, `playback_credentials_withheld_other_domain`, or `playback_credentials_withheld_insecure`, with a `basic_auth` detail. See [the media engine README](/apps/mobile/modules/podverse-media-engine/README.md#protected-media-sourcebasicauth).
- **Mobile downloads and artwork:** Android sends the header up front to in-scope URLs; OkHttp drops it on any redirect that changes host, port, or scheme. iOS withholds it, because its download and image stacks give no redirect guarantee; a protected download there fails with `credentials_withheld`.
- Car surfaces (CarPlay, Android Auto) play from the native cache, which carries no credentials.

### Feeds that need credentials on this device

A followed feed that has `requires_credentials` and no stored credentials on this device (or whose stored credentials were last rejected) appears as a **partial row** in a **Needs username and password** section at the end of the Add by RSS library list (mobile Library → Add by RSS, and the web Add by RSS page, `/add-by-rss`). Home does not include that section. Its subtitle says whether credentials are missing or were rejected. The row opens a credentials screen (web `/add-by-rss/credentials/<idText>` or channel Settings; mobile `AddByRssCredentials`) that explains the credentials stay on this device, saves them, and checks the feed right away.

### Environment

`ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` (64 hex characters, 32 bytes; `openssl rand -hex 32`) is required in the API and workers and must match. It is a **transit** key: it seals and opens queue envelopes, and nothing is encrypted at rest with it. Do not reuse the JWT secret; a dedicated key rotates independently of auth.

**Rotation:** deploy the new key as `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` with the previous one as `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD` (workers try it after the current key fails), wait at least 15 minutes for in-flight envelopes to expire, then remove `_OLD`. No data migration is involved.

- [apps/api/ENV.md](/apps/api/ENV.md) – API
- [apps/workers/ENV.md](/apps/workers/ENV.md) – Workers (`mqAddByRSSRunParser`)
- [apps/mobile/.env.example](/apps/mobile/.env.example) – mobile allow-insecure flag

### Logging

Usernames, passwords, `Authorization` headers, and envelopes never appear in API responses, parse-status payloads, logs, or unencrypted queue bodies. `redactForLog` in `packages/helpers-backend/src/redactForLog.ts` masks the credential fields; extend it before logging anything that could carry a request body.

### Testing

- **Fixtures:** `tools/test-assets` serves a gated feed, a gated feed with public media, a gated feed with media on another host, a cross-host redirect, and an `Authorization` probe. See [TOOLS-TEST-ASSETS.md § Credential fixtures](/tools/test-assets/TOOLS-TEST-ASSETS.md#credential-fixtures) and `tools/test-assets/scripts/verify-basic-auth.sh`.
- **Web E2E:** `apps/web/e2e/add-by-rss-credentials-*.spec.ts` (add, partial row, rejected, media message). The web E2E stack has no broker, so parse outcomes are stubbed.
- **Mobile E2E:** `apps/mobile/e2e/add-by-rss-credentials.yaml` (add with credentials, sign out,
  partial row, re-enter, play). `apps/mobile/e2e/add-by-rss-episode-sections.yaml` (an item's
  Chapters and Transcript on the episode page and in the full player).
  `apps/mobile/e2e/add-by-rss-track.yaml` (a music feed's track page and Lyrics).
  `apps/mobile/e2e/add-by-rss-anonymous.yaml`,
  `apps/mobile/e2e/add-by-rss-device-credentials.yaml`,
  `apps/mobile/e2e/add-by-rss-sign-in.yaml`,
  `apps/mobile/e2e/add-by-rss-anonymous-artist.yaml`,
  `apps/mobile/e2e/add-by-rss-anonymous-sections.yaml`,
  `apps/mobile/e2e/add-by-rss-anonymous-podroll.yaml`,
  `apps/mobile/e2e/signup-add-by-rss-limit.yaml`, and
  `apps/mobile/e2e/opml-signed-out.yaml`.
- **API:** `apps/api/src/test/add-by-rss-parse-credentials.test.ts`.
