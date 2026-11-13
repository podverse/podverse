**Cursor model:** Opus 5.5 · **Reasoning:** high

# 21 — Fetch and parse an Add by RSS feed on the phone

`parseAddByRssFeedOnDevice` in `apps/mobile/src/lib/addByRss/deviceParse.ts`: fetch a feed from
its host with `expo/fetch`, follow redirects by hand so credentials reach only in-scope hosts,
honor the conditional cache, parse with `podverse-partytime/core`, and map with the same
`convertParsedRSSFeedToCompat` path the server payload takes on the phone. The result has the
`AddByRssPollResult` shape plus the conditional cache to store. No Podverse API request is made.

Nothing calls it yet; plan 31 wires it into the repository.

## Rows

R3, R6, R12, R18

## Runs after

11, 20, 30

## Files

apps/mobile/package.json
apps/mobile/package-lock.json
apps/mobile/src/lib/addByRss/deviceParseEngine.ts
apps/mobile/src/lib/addByRss/deviceParseEngine.test.ts
apps/mobile/src/lib/addByRss/deviceParse.ts
apps/mobile/src/lib/addByRss/domain.ts
apps/mobile/src/lib/addByRss/domain.test.ts
apps/mobile/vitest.config.ts
release-notes/scratchpad.md

## Seam (fixed; plan 31 calls exactly this)

```ts
export type AddByRssDeviceParseInput = {
  conditionalCache: AddByRssDeviceCache | null; // type from plan 30's addByRssDevicePath.ts
  credentials: AddByRssCredentials | null;
  feedUrl: string;
  signal?: AbortSignal;
};

export type AddByRssDeviceParseResult = AddByRssPollResult & {
  conditionalCache: AddByRssDeviceCache | null;
};

export const parseAddByRssFeedOnDevice = (
  input: AddByRssDeviceParseInput
): Promise<AddByRssDeviceParseResult>;
```

- **Throws** only when Offline Mode is on (`OfflineModeEnabledError` from `prefs/offlineMode.ts`,
  which `classifySyncError` already treats as offline) or when the caller's `signal` aborts
  (rethrow the abort).
- **Returns** `status: 'failed'` for everything else that goes wrong, including a host that
  cannot be reached (DNS, connection, TLS, this module's own timeout), with
  `failureReason: 'network'`. Same classification as the server; one unreachable feed host must not
  park the whole sync queue.
- `serverError` is always `null`. The error log then records `failureReason` as the message
  (`buildAddByRssParseFailureLog` uses `serverError ?? failureReason`), and plan 31 fills
  `http_status` from `httpStatus`.
- `publisherListedFeeds` is left out. Area D decides what fills it for device-parsed artist feeds.
- `failureReason` is set on every `failed` result. `httpStatus` and `authChallenge` are set when a
  host answered with a failure status. `credentialsState` is always set: `'none'`, `'sent'`,
  `'withheld_other_domain'`, or `'withheld_insecure'`.

## Parity source

`parseRSSFeedForAddByRSS` (`packages/parser/src/lib/rss/addByRSS.ts`) plus the worker around it
(`apps/workers/src/commands/mq/rss/runAddByRSSParser.ts`, `resolveAddByRSSMessageCredentials.ts`).
Copy their order: canonicalize the URL, wait for host spacing, attach conditional headers and
Basic auth, fetch, treat 304 as `not_modified`, hash the body and treat an unchanged hash as
`not_modified`, `parseFeed(raw, { allowMissingGuid: true, maxFeedBodyBytes })`, then classify any
failure with `resolveAddByRSSParseFailureReason`.

Reuse, do not copy:

| Rule | Shared code |
| --- | --- |
| URL canonical form | `canonicalHttpOrHttpsUrl` from `@podverse/helpers-validation/client` |
| Credential scope of the feed URL itself | `resolveCredentialScope(feedUrl, feedUrl, { allowInsecure })`, as `resolveAddByRSSMessageCredentials` does |
| Credential scope across redirects | `createAddByRSSRedirectCredentialTracker` (plan 20) |
| Basic header | `encodeBasicAuthorization` from `./mediaAuth` (UTF-8, no `Buffer`) |
| Failure reason and challenge | `resolveAddByRSSParseFailureReason`, `toAddByRSSAuthChallenge` (plan 20) |
| Host spacing table | `resolveAddByRSSHostRequestSpacing` (plan 20) |
| Body normalization before hashing | `normalizeRawFeedForHash` (plan 20) |
| Body size cap | `resolveParserMaxFeedBodyBytes(undefined)` (20 MiB default, same as the server without an override) |
| Parser | `parseFeed` from `podverse-partytime/core`, the entry the server uses after plan 11 |
| Mapping | `resolveAddByRssParsePayload` in `domain.ts` (section 2), which the server path also uses |

## Decisions already made

### Redirects (R12)

- Every request uses `redirect: 'manual'`, with or without credentials, so one code path is
  exercised by every device parse. `expo/fetch` (expo 58) returns the 3xx response with its
  `Location` header on both platforms in manual mode: iOS `NativeResponse.swift` declines the
  redirect with `completionHandler(nil)`, Android `NativeRequest.kt` builds the client with
  `followRedirects(false)` and `followSslRedirects(false)`. If a 3xx comes back with no readable
  `Location`, that is an `http_error` with its status; do not fall back to `redirect: 'follow'`.
- Follow 301, 302, 303, 307, 308. At most 10 redirects; one more is a transport failure
  (`network`), as `follow-redirects` throwing on too many is on the server.
- Resolve `Location` against the URL that answered with a pure resolver
  (`resolveRedirectLocation(location, baseUrl): string | null`, exported from the engine for
  tests). Do **not** use `new URL(location, base)`: React Native 0.88's `URL`
  (`react-native/Libraries/Blob/URL.js`) joins a relative reference onto the base by string
  concatenation. The resolver handles an absolute `http:`/`https:` URL, a protocol-relative
  `//host/path`, a root-relative `/path`, and a path-relative reference (base directory plus the
  reference, with `.` and `..` segments removed), drops any fragment, and returns null for any
  other scheme. A null result is an `http_error` with the 3xx status.
- Credentials: when `credentials !== null`, decide the first request with
  `resolveCredentialScope(fetchUrl, fetchUrl, { allowInsecure })`. `'send'` attaches the header
  and starts `credentialsState` at `'sent'`; a withheld decision sends nothing and sets
  `credentialsState` to that decision. Create the tracker with
  `credentialsAttached: credentialsState === 'sent'` and `feedUrl: fetchUrl`. Each hop asks
  `tracker.allowsCredentialsTo(resolvedLocation)`; when it says no and `withheldDecision()` is
  non-null, `credentialsState` becomes that decision. Conditional headers and the User-Agent go
  on every hop.
- E2E loopback: `fetchUrl` is `rewriteUrl(canonicalUrl)` and each hop's request goes to
  `rewriteUrl(resolvedLocation)`, where the device wiring passes `resolveE2eMediaUrl` (identity
  outside the E2E harness). Scope compares the **un-rewritten** `Location` with the **rewritten**
  feed URL, the same pairing `addByRssMediaAuth.ts` uses. Under E2E this makes the test-assets
  `/redirect/other-host/` fixture a cross-host redirect on both platforms (iOS fetches
  `127.0.0.1` and is sent to `localhost`; Android fetches `10.0.2.2` and is sent to `127.0.0.1`).
  In production the rewrite does nothing.
- `allowInsecure` is `isAddByRssInsecureCredentialsAllowedFromEnv()` (on only under E2E or the
  dev env flag), the same switch playback uses.

### How hosts see phone requests (R18)

- **User-Agent:** `buildAddByRssDeviceUserAgent({ appName, appVersion, platform })` →
  `` `${appName.replace(/\s+/g, '')}/${appVersion} (${platform})` ``, for example
  `PodverseNext/5.6.0 (ios)`. Wiring passes `mobileBrandName()`, the resolved app version, and
  `Platform.OS`. No `Accept` header (the server sends none).
- **Conditional GET:** `If-None-Match` and `If-Modified-Since` from a usable cache (below). A 304
  costs the host no body.
- **Spacing:** an in-memory per-key pacer over `resolveAddByRSSHostRequestSpacing`, checked before
  every request including redirect hops. It reserves the next slot synchronously so an
  interactive add and a background refresh running together still space out:

  ```ts
  const startAt = Math.max(now(), nextAllowedAt.get(key) ?? 0);
  nextAllowedAt.set(key, startAt + spacingMs);
  if (startAt > now()) await sleep(startAt - now());
  ```

  The server sleeps 5 s before every wavlake request; the phone waits only when its previous
  wavlake request was under 5 s ago. After the wait, throw if the caller's signal aborted.
- **Timeout:** one 30 s deadline (`ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS = 30_000`) across every
  hop and the body read, through one `AbortController`. The caller's signal aborts the same
  controller (add a listener; Hermes has no `AbortSignal.any`). Our deadline firing is a
  transport failure (`network`); the caller's abort rethrows. The server uses 5 s; phones on
  cellular need longer, and plan 33's job budget is 60 s.
- **Size:** when `Content-Length` exceeds the cap, return `failed` / `parse` without reading the
  body. Otherwise read `text()` and let `parseFeed`'s `maxFeedBodyBytes` reject an oversize body.
- **No SSRF policy.** The server refuses private and loopback addresses to protect its own
  network. The phone fetches from the user's network what the user typed, so a feed on the user's
  LAN works on the device path. Intentional divergence; record it in the module comment.
- One request per refresh per feed, serial, from plan 33's queue, behind plan 30's staleness
  window. Feed hosts now see each phone's IP address instead of the Podverse servers'; area E
  documents that.

### Parser version and the conditional cache (R3)

A device-parsed feed runs the parser that shipped in the installed build. To make a later build's
parser and mapping fixes reach feeds that have not changed, the stored hash names the build that
produced the stored bundle:

- `feedHash` is `` `${parseVersion}|${normalized.length.toString(16)}-${cyrb53(normalized)}` ``
  where `normalized = normalizeRawFeedForHash(raw)` and `parseVersion` is the app version
  (`Constants.expoConfig?.version`, else `MOBILE_CLIENT_VERSION_FALLBACK`).
- A cache is **usable** only when `cache.feedHash` starts with `` `${parseVersion}|` ``. An
  unusable cache sends no conditional headers and skips the hash comparison, so the first refresh
  after an app update downloads and re-parses every device feed once, then validators work again.
- The value is opaque and device-only (plan 30's `device_feed_hash` column); it is never compared
  with the server's md5 `feedHash`. That is why the device hash does not need the server's md5:
  `cyrb53` is a 53-bit string hash in plain JS over UTF-16 code units, fast on multi-megabyte
  bodies on Hermes, with no native dependency. The md5 in `@podverse/helpers` would run through the
  pure-JS crypto shim (`src/shims/node-crypto.js`), which copies the whole body into an array.
- No migration and no new column: plan 30's columns hold the versioned hash as is.
- Feeds on the server path always get the server's current parser. Only signed-out users parse
  on the device. A device feed saved to a new account by plan 34's sign-up carry is parsed by the
  server from then on. While anyone is signed in, the signed-out user's feeds are not parsed at
  all (plans 30 and 33).

Paste `cyrb53` as a private function (public-domain algorithm by bryc; no attribution comment
needed):

```ts
const cyrb53 = (value: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
```

### Conditional cache returned

| Outcome | `conditionalCache` |
| --- | --- |
| 304 with a usable cache | `{ feedHash: cache.feedHash, etag: responseEtag ?? cache.etag, lastModified: responseLastModified ?? cache.lastModified }` |
| 2xx, hash equals a usable cache's | `{ feedHash: current, etag: responseEtag, lastModified: responseLastModified }` (null when a header is absent) |
| `parsed` (including a mapping failure) | `{ feedHash: current, etag: responseEtag, lastModified: responseLastModified }` |
| `failed` | `null` |

A 304 without a usable cache (nothing conditional was sent) is an `http_error` with status 304.
Plan 31's `deviceCacheToStore` decides what to keep from these.

### Parse and map

- `parseFeed(raw, { allowMissingGuid: true, maxFeedBodyBytes })`. Null or a throw → `failed` /
  `parse`. An empty body → `failed` / `parse`.
- Round-trip the result through JSON before mapping:
  `const payload: unknown = JSON.parse(JSON.stringify(parsedFeed));`. The server payload reaches
  the phone as JSON (dates as ISO strings), and `@podverse/parser-mapping` reads that shape (for
  example `firstValidFeedDate` checks `instanceof Date` and string dates separately). Mapping the
  same shape keeps device and server bundles identical.
- `resolveAddByRssParsePayload('parsed', payload)` gives `mappedFeed` and `preview`; a mapping
  failure gives `mappedFeed: null` with the extracted preview, exactly as a server payload would.
- Silence partytime's console sink once, at module load of `deviceParse.ts`:
  `setPartytimeLogLevel('silent')`. A creator's malformed feed is not an app fault; the result
  already carries the outcome.

## 1. Dependency — `apps/mobile/package.json`

- Copy the `podverse-partytime` specifier from `packages/parser/package.json`. Plan 11 set it to
  `file:../../../partytime`, which from `apps/mobile` is the same sibling checkout. Add that
  specifier to `apps/mobile/package.json` `dependencies`, alphabetically. Do not write a `^`
  range and do not install from the npm registry.
- Run `npm run mobile:install` from the repo root to update `apps/mobile/package-lock.json`.
  No native module is added, so no prebuild is needed.
- Metro already has `unstable_enablePackageExports = true`; partytime's `./core` export uses the
  `default` condition, which Metro resolves. Do not edit `metro.config.js`.

## 2. Shared payload mapping — `domain.ts`

Rename the private `resolveParseResult(statusResponse)` to an exported

```ts
/** `mappedFeed` and `preview` from a parse payload, the same for the server and device parses. */
export function resolveAddByRssParsePayload(
  status: ParseStatusPayload['status'],
  payload: unknown
): Pick<AddByRssPollResult, 'mappedFeed' | 'preview'>
```

Same body (keep the single documented assertion and its comment; reword "The server parse
payload" to "A parse payload"). `pollAddByRssParseStatus` calls
`resolveAddByRssParsePayload(statusResponse.status, statusResponse.payload)`. Behavior of the
server path does not change. Plan 30 left `domain.ts` alone; this is the only edit to it in the
set from area B.

## 3. Engine — `deviceParseEngine.ts` (new, pure)

No React Native or Expo imports, so Vitest runs it in node. Exports:

- `AddByRssDeviceParseInput`, `AddByRssDeviceParseResult` (seam types above).
- `ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS`, `ADD_BY_RSS_DEVICE_MAX_REDIRECTS = 10`.
- `type AddByRssDeviceFetch = (url: string, init: { headers: Record<string, string>; redirect: 'manual'; signal: AbortSignal }) => Promise<{ headers: { get(name: string): string | null }; status: number; text(): Promise<string> }>`
- `type AddByRssDeviceParseDeps = { allowInsecureCredentials: boolean; fetch: AddByRssDeviceFetch; pacer: AddByRssHostPacer; parseVersion: string; rewriteUrl: (url: string) => string; timeoutMs: number; userAgent: string }`
- `runAddByRssDeviceParse(input, deps): Promise<AddByRssDeviceParseResult>`
- `createAddByRssHostPacer({ now, sleep }): AddByRssHostPacer` with `waitTurn(url): Promise<void>`
- `resolveRedirectLocation`, `buildAddByRssDeviceUserAgent`, `hashRawFeedForDevice(raw, parseVersion)`,
  `isUsableDeviceCache(cache, parseVersion)`.

Import `AddByRssDeviceCache` as a type from `../../data/repositories/addByRssDevicePath` (plan 30;
pure module). Never log, store, or put credentials or the Authorization header in any result or
error message.

Module doc comment: what the device parse is for (signed-out users; a signed-in session always
uses the server parse), the
redirect and credential rule, the parser-version rule, and the intentional differences from the
server (no SSRF policy, 30 s timeout, spacing from the last request instead of a fixed sleep, a
non-cryptographic device-only hash, 10 redirects).

## 4. Wiring — `deviceParse.ts` (new)

```ts
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { setPartytimeLogLevel } from 'podverse-partytime/core';
import { Platform } from 'react-native';

import { sleep } from '@podverse/helpers';
```

then local imports: `MOBILE_CLIENT_VERSION_FALLBACK` (`../../auth/mobileClientHeaders`),
`isAddByRssInsecureCredentialsAllowedFromEnv` (`../../config/env`), `isOfflineModeEnabled` and
`OfflineModeEnabledError` (`../../prefs/offlineMode`), `resolveE2eMediaUrl`
(`../e2e/resolveE2eMediaUrl`), `mobileBrandName` (`../mobileBrandName`), and the engine.

- Module scope: `setPartytimeLogLevel('silent')`; resolve `parseVersion` once (empty or missing
  version → `MOBILE_CLIENT_VERSION_FALLBACK`); one `createAddByRssHostPacer({ now: Date.now, sleep })`.
- `parseAddByRssFeedOnDevice(input)`: throw `new OfflineModeEnabledError()` when
  `isOfflineModeEnabled()`; otherwise `runAddByRssDeviceParse(input, deps)` with `fetch` from
  `expo/fetch`, the pacer, `parseVersion`, `rewriteUrl: resolveE2eMediaUrl`,
  `timeoutMs: ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS`, the User-Agent, and
  `allowInsecureCredentials: isAddByRssInsecureCredentialsAllowedFromEnv()`.
- Re-export nothing; plan 31 imports `parseAddByRssFeedOnDevice` from here and types from the
  engine if it needs them.

## 5. `apps/mobile/vitest.config.ts`

Add `'src/lib/addByRss/deviceParseEngine.test.ts'` to `include` beside the other
`src/lib/addByRss/*.test.ts` entries, and one clause to the doc comment naming the device fetch
and parse engine (`src/lib/addByRss/deviceParseEngine.ts` — fetch, clock, and sleep are injected;
the `expo/fetch` wiring stays in `deviceParse.ts`).

## Tests

- `apps/mobile/src/lib/addByRss/deviceParseEngine.test.ts` (new). A fake `fetch` records each
  call's URL and headers and answers from a script. A small inline RSS fixture (channel title, one
  item with an enclosure and a guid). Cases:
  - 200 → `parsed`, `mappedFeed` title from the fixture, `preview` filled, `credentialsState:
    'none'`, no `Authorization` header, the User-Agent sent, `conditionalCache.feedHash` starts
    with `` `${parseVersion}|` ``, `etag` from the response.
  - Credentials, HTTPS, in scope → first request carries `encodeBasicAuthorization(credentials)`;
    `credentialsState: 'sent'`.
  - Redirect within the registrable domain with a relative `Location` → the hop keeps
    Authorization and goes to the resolved URL.
  - Redirect to another domain, then back to the feed's host → neither hop carries Authorization;
    a final 401 with `WWW-Authenticate: Basic` → `failed`, `credentials_withheld_other_domain`,
    `httpStatus: 401`, `authChallenge: 'basic'`.
  - `http:` feed with credentials and `allowInsecureCredentials: false` → no header,
    `credentials_withheld_insecure` on a 401.
  - 401 Basic without credentials → `credentials_required`; 401 with credentials sent →
    `credentials_rejected`; 500 → `http_error` with `httpStatus: 500`.
  - Usable cache → `If-None-Match` / `If-Modified-Since` sent; 304 → `not_modified` with the cache
    per the table. Cache from another `parseVersion` → no conditional headers and a full parse.
  - 200 whose body hashes to the usable cache's `feedHash` (same body with CRLF endings) →
    `not_modified`.
  - `fetch` rejects → `failed` / `network`. Caller signal aborted → the promise rejects. Eleven
    redirects → `failed` / `network`. Fake timer or a `timeoutMs` of a few ms with a never-settling
    fetch → `failed` / `network`.
  - Body `<html>` → `failed` / `parse`. `Content-Length` above the cap → `failed` / `parse` and
    `text()` never called.
  - `rewriteUrl` mapping `localhost` to `127.0.0.1`: feed `http://localhost:2111/a.rss` with
    credentials and insecure allowed; the 302 `Location` is `http://localhost:2111/b.rss`; the
    request goes to `http://127.0.0.1:2111/b.rss` without Authorization (scope compared
    `localhost` against the rewritten `127.0.0.1`).
  - `resolveRedirectLocation`: absolute, protocol-relative, root-relative, `../feed.rss`, a
    fragment dropped, `ftp:` → null.
  - `createAddByRssHostPacer`: two wavlake waits in a row → the second sleeps 5000 ms; a
    non-wavlake URL never sleeps; injected clock and sleep.
  - `buildAddByRssDeviceUserAgent({ appName: 'Podverse Next', appVersion: '5.6.0', platform: 'ios' })`
    → `PodverseNext/5.6.0 (ios)`.
- `apps/mobile/src/lib/addByRss/domain.test.ts`: `resolveAddByRssParsePayload('failed', undefined)`
  and `('not_modified', null)` → `mappedFeed: null` and an empty preview. The mapped case is
  covered end to end by the engine's 200 case (real `parseFeed` output, JSON round trip, mapping).
  Existing poll cases pass unchanged.
- Maestro: plan 32's `add-by-rss-anonymous.yaml` runs this engine on both platforms; plan 22's
  `add-by-rss-device-credentials.yaml` covers credentials and the cross-host redirect on both.

## Release scratchpad

```markdown
## How feed hosts see Add by RSS requests from the mobile app

- Surfaces: mobile
- Change: For signed-out users, the mobile app now requests Add by RSS feeds directly from the
  feed host instead of through Podverse servers. Signed-in users, whatever their membership, keep
  the server parse. Requests carry the User-Agent
  `<app name without spaces>/<app version> (<ios|android>)`, send `If-None-Match` and
  `If-Modified-Since` when the phone has them, follow redirects one hop at a time, and send a
  feed's username and password only to HTTPS hosts within the feed's own domain (never again
  after a hop leaves it). Requests to wavlake.com are spaced at least 5 seconds apart per phone.
  Each request times out after 30 seconds. The first refresh after an app update downloads and
  re-parses every feed kept on the phone once, so parser fixes in the new version apply. Feeds on
  a home network address can be added on the phone, which the Podverse servers refuse.
- Who notices: podcast hosts (traffic from listeners' IP addresses with the app's User-Agent);
  signed-out mobile users
- Operator steps: none
```
