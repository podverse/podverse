**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 20 — Shared Add by RSS fetch rules in `@podverse/helpers`

Move four pure rules out of the server-only fetch code into `@podverse/helpers`, so the server
fetch (workers through `@podverse/parser`) and the device fetch (plan 21) decide them with the
same code. Server behavior does not change; existing parser and worker tests are the regression
check.

The four rules:

1. Which failure reason a failed fetch gets (`classifyAddByRSSParseFailure`'s decision table and
   `toAuthChallenge`).
2. Which redirect hops may carry the feed's credentials (`buildCredentialScopedBeforeRedirect`'s
   tracking: once a hop leaves scope, every later hop goes without them).
3. Which hosts need requests spaced out (`handleRateLimitRequestDelay`'s table: wavlake).
4. How the raw feed body is normalized before hashing (`getRawFeedMd5Hash`'s trim and CRLF rule).

## Rows

R6

## Runs after

11

## Files

packages/helpers/src/lib/addByRSS/parseFailure.ts
packages/helpers/src/lib/addByRSS/parseFailure.test.ts
packages/helpers/src/lib/addByRSS/redirectCredentials.ts
packages/helpers/src/lib/addByRSS/redirectCredentials.test.ts
packages/helpers/src/lib/addByRSS/hostRequestSpacing.ts
packages/helpers/src/lib/addByRSS/hostRequestSpacing.test.ts
packages/helpers/src/lib/hash.ts
packages/helpers/src/lib/hash.test.ts
packages/helpers/src/index.ts
packages/parser/src/lib/rss/addByRSS.ts
packages/parser/src/lib/rss/addByRSSRedirectAuth.ts
packages/parser/src/lib/rss/hash/rawFeed.ts
apps/workers/src/lib/addByRSS/classifyAddByRSSParseFailure.ts
apps/workers/src/lib/addByRSS/classifyAddByRSSParseFailure.test.ts

## Decisions already made (transcribe, do not revisit)

- Only pure decisions move. Anything that reads an axios error, a `follow-redirects` options
  object, or Node `Buffer` stays where it is.
- Names in helpers carry the `AddByRSS` prefix the package already uses (`AddByRSSParseFailureReason`,
  `resolveCredentialScope`).
- The worker keeps the exported names `classifyAddByRSSParseFailure`, `readUpstreamHttpFailure`,
  `nextRequiresCredentials` and their signatures. `toAuthChallenge` moves to helpers as
  `toAddByRSSAuthChallenge`; the worker stops exporting `toAuthChallenge` (no re-export alias,
  **prefer-named-exports**). Its only importer outside the module is the worker test.
- The parser keeps exporting `CredentialsWithheldDecision` (imported by `addByRSS.ts` and listed
  in `packages/parser/src/index.ts`), now as a local alias of the helpers type.
- New helpers files are plain ESM with `.js` import specifiers, like `credentialScope.ts`
  (**import-specifiers-tiered**, Tier A).

## 1. `packages/helpers/src/lib/addByRSS/parseFailure.ts` (new)

```ts
import type {
  AddByRSSParseAuthChallenge,
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
} from '../addByRSSParseCache.js';

const BASIC_CHALLENGE = /(^|,)\s*basic\b/i;

/** Reads a `WWW-Authenticate` value as the challenge kind the device acts on. */
export const toAddByRSSAuthChallenge = (
  wwwAuthenticate: string | null | undefined
): AddByRSSParseAuthChallenge => { … same body as the worker's `toAuthChallenge`, also treating null as 'none' … };

export type AddByRSSFetchFailureSignal = {
  authChallenge: AddByRSSParseAuthChallenge;
  credentialsState: AddByRSSParseCredentialsState;
  /** The feed host's status when it answered with a failure. */
  httpStatus?: number;
  /** The request never got an answer: DNS, connection, TLS, timeout, or too many redirects. */
  transportError: boolean;
};

/** Doc comment: move the worker's bullet list here verbatim. */
export const resolveAddByRSSParseFailureReason = ({
  authChallenge,
  credentialsState,
  httpStatus,
  transportError,
}: AddByRSSFetchFailureSignal): AddByRSSParseFailureReason => { … };
```

The body is the worker's `if` chain, in the same order, returning the reason instead of
`classified(...)`:

1. `credentialsState === 'decrypt_failed'` → `'credentials_envelope_invalid'`
2. `credentialsState === 'sent'` and `httpStatus` 401 or 403 → `'credentials_rejected'`
3. `credentialsState === 'withheld_other_domain'` → `'credentials_withheld_other_domain'`
4. `credentialsState === 'withheld_insecure'` → `'credentials_withheld_insecure'`
5. `httpStatus === 401 && authChallenge !== 'other'` → `'credentials_required'`
6. `httpStatus !== undefined` → `'http_error'`
7. `transportError` → `'network'`
8. otherwise → `'parse'`

Check the import path of the three types: they live in `packages/helpers/src/lib/addByRSSParseCache.ts`
(the worker imports them from `@podverse/helpers`). Adjust the relative path if they are defined
elsewhere; do not move them.

## 2. Worker delegates — `classifyAddByRSSParseFailure.ts`

- Delete `BASIC_CHALLENGE` and `toAuthChallenge`. Import `toAddByRSSAuthChallenge` and
  `resolveAddByRSSParseFailureReason` from `@podverse/helpers`.
- `readUpstreamHttpFailure` calls `toAddByRSSAuthChallenge(readHeader(headers, 'www-authenticate'))`.
- `classifyAddByRSSParseFailure` keeps its signature and return type. Body:

```ts
const upstream: UpstreamHttpFailure =
  error === undefined ? { authChallenge: 'none' } : readUpstreamHttpFailure(error);
return {
  ...upstream,
  failureReason: resolveAddByRSSParseFailureReason({
    authChallenge: upstream.authChallenge,
    credentialsState,
    httpStatus: upstream.httpStatus,
    transportError: error !== undefined && isTransportError(error),
  }),
};
```

- Keep its doc comment, shortened to: maps a thrown fetch error (axios) to the shared failure
  reason; omit `error` when the fetch succeeded but the body did not parse. The bullet list now
  lives on `resolveAddByRSSParseFailureReason`.
- `classifyAddByRSSParseFailure.test.ts`: delete the `toAuthChallenge` describe block and drop
  it from the import. Every other case stays and must pass unchanged.

## 3. `packages/helpers/src/lib/addByRSS/redirectCredentials.ts` (new)

```ts
import type { CredentialScopeDecision } from './credentialScope.js';
import { resolveCredentialScope } from './credentialScope.js';

export type AddByRSSCredentialsWithheldDecision = Exclude<CredentialScopeDecision, 'send'>;

export type AddByRSSRedirectCredentialTracker = {
  /**
   * Whether Authorization may go with the request to `targetUrl`. False for every hop when no
   * credentials were attached, and for every hop after the first one that left scope.
   */
  allowsCredentialsTo: (targetUrl: string) => boolean;
  /** Why credentials stopped travelling, or null while they still go (or never went). */
  withheldDecision: () => AddByRSSCredentialsWithheldDecision | null;
};

/**
 * Credential scope across a chain of redirects. Credentials stay only on HTTPS hosts within the
 * feed's registrable domain (`resolveCredentialScope`), and once a hop leaves that scope they do
 * not come back, even when a later hop returns to the feed's own host.
 */
export const createAddByRSSRedirectCredentialTracker = ({
  allowInsecure,
  credentialsAttached,
  feedUrl,
}: {
  allowInsecure?: boolean;
  /** True when the first request carried credentials for this feed. */
  credentialsAttached: boolean;
  feedUrl: string;
}): AddByRSSRedirectCredentialTracker => {
  let withheld: AddByRSSCredentialsWithheldDecision | null = null;
  return {
    allowsCredentialsTo: (targetUrl) => {
      if (!credentialsAttached || withheld !== null) {
        return false;
      }
      const decision = resolveCredentialScope(feedUrl, targetUrl, { allowInsecure });
      if (decision === 'send') {
        return true;
      }
      withheld = decision;
      return false;
    },
    withheldDecision: () => withheld,
  };
};
```

Confirm `CredentialScopeDecision` and `resolveCredentialScope` are exported from
`credentialScope.ts` (the parser imports both from `@podverse/helpers` today).

## 4. Parser adapter — `addByRSSRedirectAuth.ts`

- `export type CredentialsWithheldDecision = AddByRSSCredentialsWithheldDecision;` (type import
  from `@podverse/helpers` on its own line). Drop the `CredentialScopeDecision` and
  `resolveCredentialScope` imports.
- Keep `BuildCredentialScopedBeforeRedirectOptions`, `AUTHORIZATION_HEADER`,
  `stripAuthorizationHeaders`, and the doc comment on `buildCredentialScopedBeforeRedirect`.
- New body:

```ts
const tracker = createAddByRSSRedirectCredentialTracker({
  allowInsecure,
  credentialsAttached,
  feedUrl,
});

return (redirectOptions) => {
  const alreadyWithheld = tracker.withheldDecision() !== null;
  const targetUrl = typeof redirectOptions.href === 'string' ? redirectOptions.href : '';
  if (tracker.allowsCredentialsTo(targetUrl)) {
    return;
  }
  stripAuthorizationHeaders(redirectOptions.headers);
  const decision = tracker.withheldDecision();
  if (!alreadyWithheld && decision !== null) {
    onCredentialsWithheld?.(decision);
  }
};
```

`addByRSSRedirectAuth.test.ts` is not edited and must pass unchanged: it pins strip-always when
nothing was attached, keep within scope, strip and report once when a hop leaves scope, and strip
on every later hop.

## 5. `packages/helpers/src/lib/addByRSS/hostRequestSpacing.ts` (new)

```ts
import { DEFAULT_HTTP_TIMEOUT_MS } from '../timeConstants.js';

export type AddByRSSHostRequestSpacing = {
  /** Requests that share a key share one spacing budget. */
  key: string;
  spacingMs: number;
};

/** Hosts that rate-limit feed fetches hard enough that requests must be spaced out. */
const HOST_REQUEST_SPACING_RULES: readonly (AddByRSSHostRequestSpacing & { pattern: RegExp })[] = [
  { key: 'wavlake.com', pattern: /^https?:\/\/(www\.)?wavlake\.com/, spacingMs: DEFAULT_HTTP_TIMEOUT_MS },
];

/** The spacing a feed request to `url` needs, or null when its host has no rule. */
export const resolveAddByRSSHostRequestSpacing = (url: string): AddByRSSHostRequestSpacing | null => {
  const rule = HOST_REQUEST_SPACING_RULES.find(({ pattern }) => pattern.test(url));
  return rule === undefined ? null : { key: rule.key, spacingMs: rule.spacingMs };
};
```

Confirm `DEFAULT_HTTP_TIMEOUT_MS` is exported from `packages/helpers/src/lib/timeConstants.ts`
(it is today, value 5000).

## 6. Parser uses the table — `addByRSS.ts`

Replace `handleRateLimitRequestDelay` (the function and its comment) with:

```ts
/** Sleeps before a request to a host that needs its feed requests spaced out. */
const waitForHostRequestSpacing = async (url: string): Promise<void> => {
  const spacing = resolveAddByRSSHostRequestSpacing(url);
  if (spacing !== null) {
    await sleep(spacing.spacingMs);
  }
};
```

and the call `await handleRateLimitRequestDelay(canonicalUrl);` with
`await waitForHostRequestSpacing(canonicalUrl);`. Import `resolveAddByRSSHostRequestSpacing` from
`@podverse/helpers` on the existing helpers import line; `DEFAULT_HTTP_TIMEOUT_MS` drops from that
line if nothing else in the file uses it. Change nothing else in the file (plan 11 already moved
its partytime imports to `podverse-partytime/core`).

## 7. Raw feed normalization — `hash.ts` and `rawFeed.ts`

In `packages/helpers/src/lib/hash.ts`, add beside `getMd5Hash`:

```ts
/**
 * The form of a raw feed body that change detection hashes: surrounding whitespace removed and
 * CRLF line endings read as LF, so a host that flips line endings is not a new feed.
 */
export const normalizeRawFeedForHash = (rawFeed: string): string =>
  rawFeed.trim().replace(/\r\n/g, '\n');
```

`packages/parser/src/lib/rss/hash/rawFeed.ts` becomes:

```ts
import { getMd5Hash, normalizeRawFeedForHash } from '@podverse/helpers';

export const getRawFeedMd5Hash = (rawFeed: string): string =>
  getMd5Hash(normalizeRawFeedForHash(rawFeed));
```

## 8. Barrel — `packages/helpers/src/index.ts`

Beside `export * from './lib/addByRSS/credentialScope.js';` add, in alphabetical order with the
other `./lib/addByRSS/*` lines:

```ts
export * from './lib/addByRSS/hostRequestSpacing.js';
export * from './lib/addByRSS/parseFailure.js';
export * from './lib/addByRSS/redirectCredentials.js';
```

`hash.js` is already exported. No `package.json` `exports` subpath is added; mobile already
imports the `@podverse/helpers` barrel.

## Self-check

- `rg -n "toAuthChallenge\b" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**'`
  prints nothing.
- `rg -n "handleRateLimitRequestDelay" packages` prints nothing.
- No new `as` assertions and no `any`.

## Tests

- `packages/helpers/src/lib/addByRSS/parseFailure.test.ts` (new):
  - `toAddByRSSAuthChallenge`: the five cases moved from the worker test, plus `null` → `'none'`.
  - `resolveAddByRSSParseFailureReason`, one case per branch in order, plus the precedence cases
    the worker test already pins: `withheld_other_domain` with a 401 stays withheld; `sent` with
    a 404 is `http_error`; `none` with a 401 and an `other` challenge is `http_error`; a transport
    error with `withheld_insecure` stays withheld; no status and no transport error is `parse`.
- `packages/helpers/src/lib/addByRSS/redirectCredentials.test.ts` (new): nothing attached → every
  hop false and `withheldDecision()` null; same registrable domain over HTTPS → true; another
  domain → false and `'withheld_other_domain'`, then a hop back to the feed's own host is still
  false; an `http:` hop with `allowInsecure` unset → `'withheld_insecure'`, with
  `allowInsecure: true` → true; `localhost` versus `127.0.0.1` → `'withheld_other_domain'`.
- `packages/helpers/src/lib/addByRSS/hostRequestSpacing.test.ts` (new): `https://wavlake.com/feed/x`
  and `http://www.wavlake.com/x` → `{ key: 'wavlake.com', spacingMs: 5000 }`;
  `https://example.com/wavlake.com` and `https://notwavlake.com/x` → null.
- `packages/helpers/src/lib/hash.test.ts` (new): `normalizeRawFeedForHash` trims and turns
  `\r\n` into `\n`, leaves a lone `\r` alone; `getMd5Hash(normalizeRawFeedForHash(a))` equals the
  same for `a` with CRLF endings and surrounding spaces.
- Unchanged and must pass: `packages/parser/src/lib/rss/addByRSSRedirectAuth.test.ts`,
  `apps/workers/src/lib/addByRSS/classifyAddByRSSParseFailure.test.ts` (minus the moved block),
  `apps/workers/src/lib/addByRSS/resolveAddByRSSMessageCredentials.test.ts`.

## Release scratchpad

none
