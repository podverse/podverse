**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Device-local Alby login: PKCE in the system browser, tokens in SecureStore, one-at-a-time refresh, and the client barrel area G imports. Plan 30 is the HTTP protocol. Plan 32 is the settings screens.

## Rows

R16, R18, R32

## Runs after

30

## Files

- `apps/mobile/src/v4v/alby/albySession.ts` (new)
- `apps/mobile/src/v4v/alby/albySession.test.ts` (new)
- `apps/mobile/src/v4v/alby/index.ts` (new)
- `apps/mobile/src/v4v/valueProviders.ts` (new)
- `apps/mobile/src/v4v/valueProviders.test.ts` (new)
- `apps/mobile/src/config/env.ts`
- `apps/mobile/src/config/index.ts`
- `apps/mobile/.env.example`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/vitest.config.ts`

## Tests

Unit, `apps/mobile` Vitest. Mock `expo-secure-store`, `expo-web-browser`, and `expo-crypto` with `vi.mock`, or inject them through `createAlbySession` and keep the expo imports inside the default wiring only. No Maestro. No API integration. Cases are under Session tests.

Append `src/v4v/alby/albySession.test.ts` and `src/v4v/valueProviders.test.ts` to the `include` array in `apps/mobile/vitest.config.ts`. Keep the paths plan 30 added. Do not rewrite the comment.

## Release scratchpad

```markdown
## Mobile Alby login uses a public OAuth client

- Surfaces: mobile
- Change: a build can set `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID` and optional Alby URLs. The app sends no client secret. Alby tokens stay in SecureStore on the phone and are not sent to the Podverse API.
- Who notices: operators of a build that turns on Value for Value
- Operator steps: register an Alby OAuth client whose callback is this build’s redirect URI (default `{first deep-link scheme}://alby/callback`), put that client id in `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID`, and do not put a client secret in the repo, the app, or EAS env
```

## Exported client

Area G imports this barrel and no other file under `src/v4v/alby/`. These names are the contract. Do not rename them.

From `apps/mobile/src/v4v/alby/index.ts`:

```ts
export const ALBY_PROVIDER_KEY = 'alby' as const;

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
  errorMessage: string | null;
};

export type AlbyInvoicePaymentResult = {
  amountSats: number;
  destination: string;
  feeSats: number;
  paymentHash: string;
  paymentPreimage: string;
};

export type AlbyAccountSnapshot = {
  balanceSats: number | null;
  lightningAddress: string | null;
};

export type AlbyConnectResult =
  | { status: 'connected'; account: AlbyAccountSnapshot }
  | { status: 'cancelled' }
  | { status: 'not_configured' }
  | { status: 'failed' };

export class AlbyProviderError extends Error {
  readonly kind: 'not_configured' | 'not_connected' | 'session_ended' | 'rejected' | 'transport';
  readonly httpStatus: number | null;
}

export function isAlbyConfigured(): boolean;
export function getAlbyAccountSnapshot(): AlbyAccountSnapshot | null;
export function subscribeAlbyConnection(listener: () => void): () => void;
export async function loadAlbyConnection(): Promise<void>;
export async function connectAlby(): Promise<AlbyConnectResult>;
export async function disconnectAlby(): Promise<void>;
export async function refreshAlbyAccount(): Promise<AlbyAccountSnapshot>;
export async function sendAlbyKeysends(
  payments: readonly AlbyKeysendPayment[]
): Promise<readonly AlbyKeysendPaymentResult[]>;
export async function payAlbyInvoice(invoice: string): Promise<AlbyInvoicePaymentResult>;
```

Re-export the payment types from `albyProtocol.ts` (same fields). `AlbyProviderError` is this module’s error, not `AlbyProtocolError`. Map protocol `invalid_request` to `rejected`, `unexpected_response` and protocol `http` (except session end, below) to `transport`.

From `apps/mobile/src/v4v/valueProviders.ts` (G and plan 32 both import this):

```ts
export const VALUE_PROVIDER_KEYS = ['alby'] as const;
export type ValueProviderKey = (typeof VALUE_PROVIDER_KEYS)[number];

export type ValueProviderDefinition = {
  key: ValueProviderKey;
  titleKey: 'v4v.provider.alby';
};

export function listValueProviders(): readonly ValueProviderDefinition[];

export type ValueProviderConnection =
  | { key: 'alby'; status: 'disconnected' }
  | { key: 'alby'; status: 'connected'; account: AlbyAccountSnapshot };

export function getValueProviderConnection(key: ValueProviderKey): ValueProviderConnection;
```

`listValueProviders` returns one definition, Alby, always. `getValueProviderConnection('alby')` is `connected` when `getAlbyAccountSnapshot()` is non-null, otherwise `disconnected`. The snapshot is non-null only after a successful account read in this process, or after `loadAlbyConnection` finds tokens and a stored display snapshot. Tokens alone, before that load, are `disconnected` until `loadAlbyConnection` finishes.

Do not export `createAlbySession`. Tests import it from `albySession.ts`.

## Config

`EXPO_PUBLIC_*` literals stay in `apps/mobile/src/config/env.ts` only. Add getters and put the fields on `MobileConfig` via `getMobileConfig()` in `apps/mobile/src/config/index.ts`. Outside `src/config/`, read `getMobileConfig()`.

| Env | When unset | When set |
| --- | --- | --- |
| `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID` | `null` (Alby is not configured) | trimmed string |
| `EXPO_PUBLIC_ALBY_OAUTH_AUTHORIZE_URL` | `https://getalby.com/oauth` | https URL, no trailing slash |
| `EXPO_PUBLIC_ALBY_API_BASE_URL` | `https://api.getalby.com` | https URL, no trailing slash |
| `EXPO_PUBLIC_ALBY_OAUTH_REDIRECT_URI` | `{deepLinkSchemes[0]}://alby/callback` | a URL whose scheme is one of `deepLinkSchemes` |

An override that is not https, or a redirect whose scheme is not registered, is ignored and the unset value is used. Do not throw during startup. Do not add a client-secret env var.

`apps/mobile/.env.example`, beside `EXPO_PUBLIC_MOBILE_V4V_ENABLED`, double-quoted non-empty values, empty keys with nothing after `=`:

```
# Public Alby OAuth client id. Unset hides Connect. Never put a client secret here.
EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID=
# Unset uses https://getalby.com/oauth
EXPO_PUBLIC_ALBY_OAUTH_AUTHORIZE_URL="https://getalby.com/oauth"
# Unset uses https://api.getalby.com
EXPO_PUBLIC_ALBY_API_BASE_URL="https://api.getalby.com"
# Unset uses {first EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES scheme}://alby/callback
EXPO_PUBLIC_ALBY_OAUTH_REDIRECT_URI=
```

`isAlbyConfigured()` is `getMobileConfig().alby.clientId !== null`. The Value for Value flag is separate and stays in plan 32.

Add `expo-crypto` with `npm --prefix apps/mobile exec -- expo install expo-crypto` so the version matches SDK 58, then commit `apps/mobile/package.json` and `apps/mobile/package-lock.json`. Do not add an Alby SDK, a WebView package, or a Nostr Wallet Connect package. Area G may also edit those two package files later; leave every other dependency as it is.

## Session

`createAlbySession(deps)` returns the functions in the barrel. The barrel calls one module-level session built with:

- SecureStore (`expo-secure-store`), `keychainAccessible: SecureStore.WHEN_UNLOCKED`. Keys `v4v.alby.tokens` and `v4v.alby.display` and `v4v.alby.oauth_pending`. Same options on every read, write, and delete.
- `expo-web-browser` `openAuthSessionAsync` and `maybeCompleteAuthSession`.
- `expo-crypto` `getRandomBytesAsync` for `nextByte`, and `digestStringAsync(CryptoDigestAlgorithm.SHA256, verifier, { encoding: CryptoEncoding.BASE64 })` then the protocol’s base64url step (or digest to bytes and call `codeChallengeS256`).
- `createAlbyHttp(config, createDefaultAlbyTransport())` with config from `getMobileConfig().alby`.
- `Date.now`.

In-memory subscribers: a `Set` of listeners and `useSyncExternalStore`-compatible `subscribeAlbyConnection` / `getAlbyAccountSnapshot`. Notify after every snapshot change. `getAlbyAccountSnapshot` is synchronous and returns the memory value (null before `loadAlbyConnection`).

Stored JSON, parsed with `isObjectLike` and field checks. A corrupt value is deleted and treated as signed out of Alby.

- Tokens: `AlbyTokenSet`.
- Display: `AlbyAccountSnapshot`. This is not a secret. It lets the settings row paint the last balance without a request. Tokens never go in this value.
- Pending: `{ codeVerifier: string; state: string }`.

`loadAlbyConnection`

- Read tokens and display. If tokens exist, set the snapshot to the stored display or `{ balanceSats: null, lightningAddress: null }` when display is missing, and notify. If tokens are missing, set the snapshot to null and delete display. Never throws. Does not call the network.

`connectAlby`

- If `clientId` is null, return `{ status: 'not_configured' }` and do not open a browser.
- If a connect is already in flight, return that promise.
- `createPkcePair`, persist pending, build the authorize URL, `maybeCompleteAuthSession()`, then `openAuthSessionAsync(authorizeUrl, redirectUri)`.
- `cancel` or `dismiss`: delete pending, return `{ status: 'cancelled' }`.
- `success`: `parseAlbyOAuthRedirect(result.url, pending.state)`. On `state_mismatch` or `missing_code`, delete pending and return `{ status: 'failed' }`.
- Exchange the code. On success, store tokens, delete pending, `refreshAlbyAccount`, return `{ status: 'connected', account }`.
- On exchange failure, delete pending and tokens, return `{ status: 'failed' }`.
- Do not navigate. Plan 32’s screen is already open.

`disconnectAlby`

- Delete tokens, display, and pending. Set the snapshot to null and notify.

`refreshAlbyAccount`

- Requires tokens. Otherwise throw `AlbyProviderError` kind `not_connected`.
- GET summary and value4value through the access-token helper below. Store and publish `{ balanceSats, lightningAddress }`. One of the two reads failing as `transport` keeps the other field and the previous value for the field that failed. `session_ended` clears everything and throws.

`sendAlbyKeysends` / `payAlbyInvoice`

- Require tokens (`not_connected` if missing).
- Run through the access-token helper. Return the protocol results. A per-item `errorMessage` is returned, not thrown.
- `invalid_request` from the protocol becomes `rejected` and does not call the network.
- `connectAlby` does not throw after the browser returns. A failed exchange returns `{ status: 'failed' }`. After a successful exchange, store the tokens and call `refreshAlbyAccount`. If that returns, `{ status: 'connected', account }`. If it throws `session_ended`, return `{ status: 'failed' }` (tokens are already cleared). If it throws `transport`, return `{ status: 'connected', account }` with the snapshot already published, or `{ balanceSats: null, lightningAddress: null }` when nothing was published.

Access-token helper

- If `shouldRefreshAlbyAccessToken`, refresh first.
- Call the request.
- When the caught error is `AlbyProtocolError` kind `http` and `isAlbyExpiredAccessToken(error.httpStatus ?? 0, error.responseData)`, refresh once and call once more. Return that second result. The protocol error must still carry `responseData`; that is how this check sees `expired access token`.
- Refresh itself: one module-level promise. A second caller awaits the same promise. Alby accepts a refresh token once; a second refresh in parallel invalidates the session.
- Refresh HTTP 4xx, or a second 401 after the retry: delete tokens, display, and pending, set the snapshot to null, throw `session_ended`.
- Refresh timeout or 5xx: throw `transport` and keep the stored tokens.
- Do not show an alert from this module.

Comments, in the session file, as the code stands: the refresh lock exists because a second refresh invalidates the Alby session; tokens stay on the phone across Podverse sign-out because a signed-out listener sends boosts with this wallet. Do not cite a plan. Do not call `disconnectAlby` from `clearSession` in `apps/mobile/src/auth/AuthProvider.tsx`. Do not log tokens, authorization codes, verifiers, or refresh tokens.

## Session tests

Drive `createAlbySession` with a memory store, a fake browser, a fake clock, and a fake `AlbyHttp`.

- Connect persists the verifier before opening the browser, exchanges only when `state` matches, and returns `cancelled` without an exchange.
- `not_configured` does not open the browser.
- Two overlapping `refreshAccessToken` calls share one HTTP refresh.
- A fake `AlbyProtocolError` kind `http`, `httpStatus` 401, `responseData` `{ error: 'expired access token' }` refreshes once and returns the second payment result.
- A second 401 clears tokens and throws `session_ended`.
- A refresh 5xx keeps tokens and throws `transport`.
- `disconnectAlby` clears tokens and the snapshot.
- `loadAlbyConnection` with tokens and display publishes that display and does not call HTTP.
- `listValueProviders()` has length 1 and key `alby`.
- `getValueProviderConnection('alby')` follows the snapshot.
- Config getters: empty client id is null; a non-https API base falls back to `https://api.getalby.com`; redirect falls back when the scheme is not in `deepLinkSchemes`.

## Out of scope

Settings screens, navigation routes, catalog copy, and the boost sheet. Do not edit `AuthProvider.tsx`. Do not add streaming sats, a node, a QR flow, or Nostr Wallet Connect.
