**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Alby’s HTTP protocol for this app: OAuth token exchange as a public PKCE client, account reads, keysend, and paying a BOLT11 invoice. No screens, no token storage, and no React Native imports. Plan 31 wraps this in secure storage and the system browser. Area G calls plan 31’s barrel, not these files.

## Rows

R32, R33, R36

## Runs after

none

## Files

- `apps/mobile/src/v4v/alby/albyProtocol.ts` (new)
- `apps/mobile/src/v4v/alby/albyProtocol.test.ts` (new)
- `apps/mobile/src/v4v/alby/albyHttp.ts` (new)
- `apps/mobile/src/v4v/alby/albyHttp.test.ts` (new)
- `apps/mobile/vitest.config.ts`

## Tests

Unit, in `apps/mobile` Vitest (`environment: 'node'`). No Maestro. No API integration. The cases are listed under the protocol and HTTP sections below. Do not call the network.

Mobile Vitest runs an explicit `include` list. Append `src/v4v/alby/albyProtocol.test.ts` and `src/v4v/alby/albyHttp.test.ts`. Do not remove paths already listed, and do not rewrite the comment.

## Release scratchpad

none

## Settled

- This is the Alby OAuth wallet API at `https://api.getalby.com` (authorize at `https://getalby.com/oauth`). Alby’s docs mark that API as deprecated and point new apps at Nostr Wallet Connect. This set does not build Nostr Wallet Connect, a phone Lightning node, or a QR-only flow. Do not add those packages or endpoints.
- The phone is a public OAuth client. Token requests send HTTP Basic with the client id as the username and an empty password, plus `client_id` in the form body. Do not add a `client_secret` field, an env var for a secret, or an API route that holds one. Do not copy any client id or secret out of `../podverse-rn`.
- Scope is `account:read balance:read payments:send`. Do not request `transactions:read`, `invoices:read`, or `invoices:create`.
- Amounts are whole satoshis. The client does not build a boost message. Callers pass `customRecords` whose values are already strings.
- This plan’s HTTP functions each send one request. Plan 31 retries a call only after HTTP 401 whose JSON `error` is exactly `expired access token`, and it returns that second response. No retry on timeout or any other status (a second POST can pay twice). Plan 31 also keeps a single refresh in flight.

## Protocol (`albyProtocol.ts`)

Pure functions. Import `isObjectLike` from `@podverse/helpers/guards`. No `as` except `as const` on the scope string. No `any`.

```ts
export const ALBY_OAUTH_SCOPE = 'account:read balance:read payments:send' as const;
export const ALBY_AUTHORIZE_URL = 'https://getalby.com/oauth';
export const ALBY_API_BASE_URL = 'https://api.getalby.com';
export const ALBY_ACCESS_TOKEN_SKEW_MS = 60_000;
export const ALBY_PAYMENT_TIMEOUT_MS = 90_000;
export const ALBY_ACCOUNT_TIMEOUT_MS = 20_000;

export type AlbyClientConfig = {
  clientId: string;
  authorizeUrl: string;
  apiBaseUrl: string;
  redirectUri: string;
};

export type AlbyTokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtMs: number;
  scope: string;
};

export type AlbyKeysendPayment = {
  amountSats: number;
  destination: string;
  customRecords: Readonly<Record<string, string>>;
};

export type AlbyKeysendPaymentResult = {
  amountSats: number | null;
  destination: string | null;
  feeSats: number | null;
  paymentHash: string | null;
  paymentPreimage: string | null;
  /** Alby’s message, or `unexpected_result` when the element is not a payment or an error object. */
  errorMessage: string | null;
};

export type AlbyInvoicePaymentResult = {
  amountSats: number;
  destination: string;
  feeSats: number;
  paymentHash: string;
  paymentPreimage: string;
};
```

`createPkcePair(nextByte: () => number): { codeVerifier: string; state: string }`

- `codeVerifier` is 64 characters. `state` is 32. Alphabet is `A–Z`, `a–z`, `0–9`.
- `nextByte` returns an integer 0–255. Map with rejection sampling so the alphabet is not biased. Do not use `Math.random`.

`codeChallengeS256(verifier: string, sha256: (input: Uint8Array) => Uint8Array): string`

- SHA-256 the UTF-8 verifier, then base64url with no padding (`+` to `-`, `/` to `_`, strip `=`).
- Test vector from RFC 7636: verifier `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` challenges to `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`.

`buildAlbyAuthorizeUrl(config, pair, codeChallenge): string`

- Query on `config.authorizeUrl`: `response_type=code`, `client_id`, `scope` (the constant above, not pre-encoded), `code_challenge_method=S256`, `code_challenge`, `redirect_uri`, `state`.
- Use `URL` and `URLSearchParams`. Do not hand-concatenate.

`parseAlbyOAuthRedirect(url: string, expectedState: string): { code: string } | { error: 'state_mismatch' | 'missing_code' }`

- Read `code` and `state` from the query. Missing or empty `code` is `missing_code`. `state` must be exactly `expectedState` or the result is `state_mismatch` (even when a code is present).

`isAlbyOAuthCallbackPath(path: string): boolean`

- True for `podverse-next://alby/callback`, `podverse://alby/callback?code=1&state=2`, and `/alby/callback`.
- Compare the first two path segments, case-sensitive, to `alby` and `callback`. A custom scheme has no host: the segment before `://` is the scheme, and `alby` is the next segment (same split as `tryParseUrlPath` in `apps/mobile/src/navigation/deepLinking.ts`).
- False for `/album/callback`, `/alby`, and `/alby/callback/extra`.

`parseAlbyTokenResponse(data: unknown, nowMs: number): AlbyTokenSet | null`

- Requires string `access_token`, string `refresh_token`, and a finite positive `expires_in` (seconds). `scope` is that string or `''`.
- `accessTokenExpiresAtMs = nowMs + expires_in * 1000`. Null on any other shape.

`shouldRefreshAlbyAccessToken(token, nowMs): boolean`

- True when `nowMs >= accessTokenExpiresAtMs - ALBY_ACCESS_TOKEN_SKEW_MS`.

`isAlbyExpiredAccessToken(status: number, data: unknown): boolean`

- True only when `status === 401` and `data` is an object whose `error` is the string `expired access token`.

`validateAlbyKeysendPayments(payments): { keysends: { amount: number; destination: string; custom_records: Record<string, string> }[] } | { error: 'empty' | 'invalid_amount' | 'invalid_destination' | 'invalid_record' }`

- Empty list is `empty`.
- `amountSats` must be an integer from 1 through `Number.MAX_SAFE_INTEGER`.
- `destination` must be a non-empty string after trim. Send the trimmed value.
- Every `customRecords` value must be a string. Do not `JSON.stringify` a value. A non-string value is `invalid_record`.
- Wire field names are `amount`, `destination`, `custom_records`.

`validateAlbyInvoice(invoice: string): string | { error: 'empty' }`

- Trim. Empty is `empty`. Do not require an `ln` prefix.

`parseAlbyKeysendMultiResponse(data: unknown): readonly AlbyKeysendPaymentResult[] | null`

- `data.keysends` must be an array. Otherwise null.
- Each element is an object. Read `keysend` when it is an object: `amount`, `destination`, `fee` as finite numbers or null; `payment_hash` and `payment_preimage` as strings or null.
- Read `error.message` when `error` is an object and `message` is a string.
- `errorMessage` is that message, or `unexpected_result` when the element has neither a `keysend` object nor an error message, or null when a keysend object is present and there is no error message.
- A per-item error does not throw. The array keeps one result per element, in order.

`parseAlbyBolt11Response(data: unknown): AlbyInvoicePaymentResult | null`

- Requires finite `amount`, string `destination`, finite `fee`, string `payment_hash`, and string `payment_preimage`. Otherwise null. Map `amount` to `amountSats` and `fee` to `feeSats`.

`parseAlbyAccountSummary(data: unknown): { balanceSats: number | null }`

- `balance` is a finite number, or null. Ignore every other field.

`parseAlbyValue4Value(data: unknown): { lightningAddress: string | null }`

- `lightning_address` is a non-empty string, or null. Ignore `keysend_custom_key` and `keysend_custom_value`.

`basicAuthHeader(clientId: string): string`

- `Basic ` plus base64 of `` `${clientId}:` `` (nothing after the colon). Use `globalThis.btoa`. ASCII client ids only; do not pull in a base64 package.

## HTTP (`albyHttp.ts`)

```ts
export type AlbyTransport = (input: {
  url: string;
  method: 'GET' | 'POST';
  data?: string | Readonly<Record<string, unknown>>;
  headers: Readonly<Record<string, string>>;
  timeoutMs: number;
}) => Promise<{ status: number; data: unknown }>;

export function createAlbyHttp(config: AlbyClientConfig, transport: AlbyTransport): AlbyHttp;
export function createDefaultAlbyTransport(): AlbyTransport;
```

`AlbyHttp` methods, each one request:

| Method | Request |
| --- | --- |
| `exchangeAuthorizationCode({ code, codeVerifier })` | POST `{apiBaseUrl}/oauth/token`. Header `Content-Type: application/x-www-form-urlencoded` and `Authorization` from `basicAuthHeader`. Body string from `URLSearchParams`: `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`, `client_id`. Timeout `ALBY_ACCOUNT_TIMEOUT_MS`. Parse with `parseAlbyTokenResponse` and `Date.now()`. |
| `refreshAccessToken(refreshToken)` | Same URL and headers. Body `grant_type=refresh_token`, `refresh_token`, `client_id`. Same timeout. |
| `getAccountSummary(accessToken)` | GET `{apiBaseUrl}/user/summary`. `Authorization: Bearer ${accessToken}`. |
| `getValue4Value(accessToken)` | GET `{apiBaseUrl}/user/value4value`. Same bearer. |
| `sendKeysends(accessToken, payments)` | POST `{apiBaseUrl}/payments/keysend/multi`. JSON object `{ keysends }` from `validateAlbyKeysendPayments`. Timeout `ALBY_PAYMENT_TIMEOUT_MS`. Bearer. |
| `payInvoice(accessToken, invoice)` | POST `{apiBaseUrl}/payments/bolt11`. JSON `{ invoice }` from `validateAlbyInvoice`. Same payment timeout. Bearer. |

Throw `AlbyProtocolError` (named export, `extends Error`). Fields: `kind`, `httpStatus: number | null`, `responseData: unknown`.

- `invalid_request` when validate returns an error (no HTTP call). `httpStatus` null, `responseData` null.
- `unexpected_response` when the status is 200 and the parser returns null, or when keysend validation passed but the multi parser returns null. `responseData` is the body that failed to parse.
- `http` for any other transport throw or non-200 status. `httpStatus` is the transport status, or null when the transport threw with no status. `responseData` is the response body when the transport returned one (the 401 `{ error: "expired access token" }` body), otherwise null.

Plan 31’s retry reads `httpStatus` and `responseData`. Do not drop the body.

Do not retry inside `AlbyHttp`. Do not refresh. Do not read or write storage.

`createDefaultAlbyTransport` calls `request` from `@podverse/helpers-requests` (axios `data`, not a `body` field). Pass `AbortOptions` `{ controller: new AbortController(), timeoutMs }`. On throw, read status with a local guard: `isObjectLike(error)` and `isObjectLike(error.response)` and `typeof error.response.status === 'number'`. Do not use `getStatusCodeFromError` (it does not read axios’s `response.status`). Return `{ status, data: error.response.data }` for an HTTP error response so callers can see a 401 body. Rethrow when there is no status (network, abort).

Token POSTs pass `data` as the form string so axios does not JSON-encode it. Payment POSTs pass `data` as the object. Explicit `Content-Type` on the token call overrides the JSON default that `request` adds for POST.

## Tests to include

- RFC 7636 challenge vector.
- Authorize URL contains the scope, S256, the challenge, the redirect, and the state, and does not contain `client_secret`.
- Redirect parser: matching state, mismatched state, missing code.
- `isAlbyOAuthCallbackPath` for the three true shapes and the three false shapes above.
- Token parser: happy path expiry math, missing refresh token returns null.
- `shouldRefreshAlbyAccessToken` true inside the skew window and false before it.
- `isAlbyExpiredAccessToken` true only for that 401 body.
- Keysend validator rejects an empty list, a fractional amount, a blank destination, and a non-string record. It copies string records through unchanged.
- Multi response keeps a success and a per-item error in order. A missing `keysends` array returns null.
- Bolt11 parser rejects a body without `payment_preimage`.
- Summary and value4value ignore unknown fields.
- `createAlbyHttp` with a fake transport: authorization-code body includes `client_id` and `code_verifier` and omits `client_secret`; Basic header is base64 of `id:`; a 401 response is `AlbyProtocolError` kind `http` and does not send a second request; keysend POST path is `/payments/keysend/multi`; bolt11 path is `/payments/bolt11`.

## Out of scope

Screens, SecureStore, the system browser, env wiring, navigation, catalog strings, and the boost sheet. No streaming-sats endpoint. No `/payments/keysend` single call (only the multi call, including a one-element list).
