# Add-by-RSS

Add-by-RSS lets users follow RSS feeds (podcasts, music) that are not in the main directory. Feeds are parsed by workers and kept in each device's add-by-RSS library; the account's follow list syncs which feeds a user follows across devices. On mobile, that library is My Library → Add by RSS (chips for podcasts, episodes, artists, albums, and tracks; plus to add). Home lists directory follows only. On web, the add-by-RSS sidebar routes keep the same separation from Home. CarPlay and Android Auto keep add-by-RSS follows in the native library index.

## Basic Auth (private feeds)

Feeds behind HTTP Basic Auth are supported. **The server never stores the username or password.** Each device keeps them in its own secure storage and sends them only with the requests that need them. The follow row (`account_following_add_by_rss_channel`) carries a `requires_credentials` flag instead, so another device knows to ask the user before it can refresh the feed.

The durable constraints live in [`add-by-rss-client-held-credentials`](/.cursor/rules/add-by-rss-client-held-credentials.mdc).

### Where credentials live

| Surface | Store                                                                                                                                                                         | Scope                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Web     | IndexedDB database `add-by-rss-credentials`, values AES-GCM encrypted with a non-extractable per-account WebCrypto key (`apps/web/src/utils/addByRSS/credentialStore.ts`)     | Account + canonical feed URL |
| Mobile  | SecureStore, with an `add_by_rss_credential_index` table listing which feeds have an entry (`apps/mobile/src/data/repositories/addByRssCredentialStore.ts`)                   | Account + canonical feed URL |
| Server  | Nothing. Postgres keeps `requires_credentials` only; Valkey parse-cache entries keep `failureReason`, `httpStatus`, `authChallenge`, and `credentialsState`, never the secret | —                            |

Signing out (and deleting the account) clears that account's credentials on the device. The feeds themselves stay; they are device data.

A `user:pass@` pasted into a feed URL is split into the username and password fields on the client and again in the API. Stored feed URLs never carry userinfo, and credentials are keyed by the canonical URL (`canonicalAddByRSSFeedUrl` in `@podverse/helpers-validation`).

The Add control stays disabled until the URL is a valid http(s) feed URL. When the username and password toggle is on, it also requires both fields non-empty (`canSubmitAddByRssFeed` in `@podverse/helpers-validation`). The credentials save screen uses the same length rules (`canSubmitAddByRssCredentials`).

### Parse path (transit envelope)

1. The client sends `basic_auth_username` / `basic_auth_password` with `POST /account/add-by-rss/parse`, or `credentials_by_url` with `POST /account/add-by-rss/parse/all`.
2. The API seals them into an AES-256-GCM envelope (`sealAddByRssCredentialsForParse` in `apps/api/src/lib/addByRSSCredentials.ts`, built on `packages/helpers-backend/src/addByRssCredentialsTransit.ts`). The envelope expires after **15 minutes** and its associated data binds it to `accountId | requestId | feedUrl`, so a copied envelope cannot be replayed against another request or feed. The queue message carries only the envelope; its dedupe id excludes it.
3. The worker opens the envelope in memory, checks the feed URL's scope, and fetches the feed with the Basic Auth header.
4. The parse result records `failureReason` / `credentialsState` for the client: `credentials_required`, `credentials_rejected`, `credentials_withheld_other_domain`, `credentials_withheld_insecure`, or `credentials_envelope_invalid`.

A flagged feed with no credentials in a refresh-all is not queued; it reports `credentials_required`.

**Chapters and transcripts** (`POST /account/add-by-rss/chapters-transcript`): the client sends the credentials together with `feedUrl`; the API applies them only to in-scope URLs and never stores them.

### `requires_credentials`

- The client sets it when a feed is added with credentials.
- The worker sets it when a parse without credentials gets a Basic `401`.
- The worker clears it when a parse without credentials succeeds.
- The worker leaves it set when credentials were sent and rejected (`401` / `403`).

Linear migration `0012_add_by_rss_client_credentials.sql` dropped the encrypted columns and set the flag on every row that had them, so those users enter credentials again on each device.

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

A followed feed that has `requires_credentials` and no stored credentials on this device (or whose stored credentials were last rejected) appears as a **partial row** in a **Needs username and password** section at the end of the Add by RSS library list (mobile Library → Add by RSS, and the web add-by-RSS library routes). Home does not include that section. Its subtitle says whether credentials are missing or were rejected. The row opens a credentials screen (web `/add-by-rss/credentials/<idText>` or channel Settings; mobile `AddByRssCredentials`) that explains the credentials stay on this device, saves them, and checks the feed right away.

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
- **Mobile E2E:** `apps/mobile/e2e/add-by-rss-credentials.yaml` (add with credentials, sign out, partial row, re-enter, play).
- **API:** `apps/api/src/test/add-by-rss-parse-credentials.test.ts`.
