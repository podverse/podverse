**Cursor model:** Opus 5.5 · **Reasoning:** high

# 40 — Remote-item lookup and resolve answer signed-out callers

`POST /account/add-by-rss/remote-item/lookup` and `POST /account/add-by-rss/remote-item/resolve`
stop requiring a session. Both read public data keyed by a feed guid or URL the client already
holds, so a signed-out device that parsed a feed itself can match the feed's podroll, remote
items, and an artist's listed albums against the Podverse directory. A signed-in caller and an
API key behave exactly as today.

Lookup keeps no rate limit. Resolve gets a second budget for signed-out callers: a new env var,
`ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` (default 120), counted per IP
address. Signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` (default
30), counted per account.

## Rows

R14, R16, R44, R45

## Runs after

none (API only; no dependency on areas A to C)

## Files

apps/api/src/lib/rateLimiter.ts
apps/api/src/controllers/account/accountAddByRSSRemoteItem.ts
apps/api/src/config/index.ts
apps/api/src/lib/startup/validation.ts
apps/api/.env.example
apps/api/ENV.md
infra/k8s/base/api/source/api.env
dev/env-overrides/local/rate-limit.env.example
scripts/local-env/setup.sh
packages/helpers-config/src/podverseTestEnv.ts
apps/api/openapi.yml
apps/api/src/test/account-add-by-rss-remote-item.integration.test.ts
release-notes/scratchpad.md

## Why these routes, and why public

- Lookup reads only the directory match and the remote stub tables (no index provider call, no
  writes). It is the same kind of read as the public `GET /channel/directory-match`, which the
  device already calls signed out from `storeArtistRelations` in
  `apps/mobile/src/data/repositories/addByRssRepository.ts`. One request carries at most
  `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS` (100) references, and the device batches to that size.
- Resolve may ask the index provider for one feed by guid or URL and write or refresh one remote
  stub row. The public `GET /external-services/podcast-index/search/podcasts` and
  `/external-services/podcast-index/feed/:podcast_index_id` already ask the index provider for any
  visitor with no auth, and the stub tables hold public provider data only.
- Both routes already run with `skipMembershipStatus: true`, so every signed-in account uses them
  today. Only the signed-out case changes.
- The paths stay under `/account/...` so web and existing clients keep working. Public routes
  under `/account` already exist (`/account/recent`, `/account/top`).

## 1. Config and env — `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE`

Follow **env-defaults-match-code** and **env-file-formatting**: the default 120 appears in every
template, double-quoted in `.env` / `.env.example` files and unquoted in the K8s source file.
Place the new key on the line right after `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE`
in every file (**startup-validation-env-order**).

- `apps/api/src/config/index.ts`: in the `rateLimits` type (line 50) add
  `accountAddByRssRemoteItemResolveAnon: { windowMs: number; max: number };` after
  `accountAddByRssRemoteItemResolve`. In the value (line 330) add the matching entry with
  `parseCountPerWindowEnvFromKey({ envValue: process.env.ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE, key: 'ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE', defaultMax: 120 })`.
  The `_PER_MINUTE` suffix sets the one-minute window, as for the account key.
- `apps/api/src/lib/startup/validation.ts` (lines 304–309): a `validateOptional` call for the new
  key, category `'Add-by-RSS'`, message `'Use Default (120)'`.
- `apps/api/.env.example` (line 78): `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE="120"`.
- `apps/api/ENV.md` (line 121): reword the account line to "per signed-in account per minute",
  and add: "`ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` (default `120`) — Add by
  RSS remote item resolve calls per IP address per minute from signed-out callers; signed-in
  callers count against the per-account limit instead."
- `infra/k8s/base/api/source/api.env` (line 34):
  `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE=120`.
- `dev/env-overrides/local/rate-limit.env.example` (line 18): the same key, `"120"`.
- `scripts/local-env/setup.sh` (line 543): add the key to the `# From rate-limit.env` loop list,
  right after `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE`.
- `packages/helpers-config/src/podverseTestEnv.ts`: in `apiProfileOverrides.apiVitest` add
  `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE: '10'` with a comment: the
  signed-out resolve 429 case walks to this cap, and the production default of 120 would make it
  121 requests. Leave `apiWebE2e` and `apiMobileE2e` on the default; their signed-out resolve
  traffic is a few calls per flow.

## 2. Optional-auth limiter — `apps/api/src/lib/rateLimiter.ts`

Add an exported `rateLimitOptionalAuthEndpoint` beside `rateLimitAuthEndpoint`:

```ts
// shape this plan asks for
export function rateLimitOptionalAuthEndpoint(options: {
  account: { windowMs: number; max: number };
  address: { windowMs: number; max: number };
  apiKeyAccess?: ApiKeyPermissionRequirement;
}): OptionalAuthRateLimitMiddleware;
```

- Authenticates with `optionalEnsureAuthenticated` (from `@api/lib/auth/index.js`) with
  `skipMembershipStatus: true` and `apiKeyAccess`, the options `rateLimitAuthEndpoint` passes to
  `ensureAuthenticated`, so a bad token or a key without the permission is refused exactly as
  today.
- Two limiters built with `createLimiter`:
  - account: keyed `user:<id>` with the same user-id read `rateLimitAuthEndpoint`'s key generator
    uses (extract it into one private helper both call, rather than copying it);
  - address: keyed `ip:${ipKeyGenerator(req.ip ?? '')}`, with its own `new MemoryStore()` from
    `express-rate-limit` passed to `createLimiter` (add an optional `store` field to
    `createLimiter`'s options and pass it through to `rateLimit`).
- After auth, a request with a user goes through the account limiter, otherwise through the
  address limiter. An API key request has a user, so it counts per account.
- `OptionalAuthRateLimitMiddleware` is the middleware plus `resetForUser(userId)` (same as
  `AuthRateLimitMiddleware`) and `resetAddressBudgets(): Promise<void>` (calls `resetAll()` on the
  address store). Doc comment: test support; both budgets live in the API process's memory.
- Doc comment on the function: for public endpoints whose budget follows the account when there
  is one and the IP address when there is not, each with its own limit.

## 3. Controller — `apps/api/src/controllers/account/accountAddByRSSRemoteItem.ts`

- `lookup`: replace `ensureAuthenticated` with `optionalEnsureAuthenticated`, keeping the options
  object as is (`skipMembershipStatus: true`, `apiKeyAccess: { resource: 'add_by_rss', action:
  'read' }`). The handler body does not read `req.user` and does not change. No limiter.
- `resolve`: same swap.
- `addByRssRemoteItemResolveRateLimit`: build it with `rateLimitOptionalAuthEndpoint({ account:
  config.rateLimits.accountAddByRssRemoteItemResolve, address:
  config.rateLimits.accountAddByRssRemoteItemResolveAnon, apiKeyAccess: { resource: 'add_by_rss',
  action: 'read' } })` (pass `windowMs` and `max` explicitly if the config objects carry more).
- Update the class or method doc comments that say a session is required.
- `apps/api/src/routes/account.ts` (lines 208–216) mounts the controller methods and the resolve
  limiter; no route change is needed. Confirm no other wrapper on these two paths requires auth.

## 4. OpenAPI — `apps/api/openapi.yml`

Search `operationId: apiPostAccountAddByRSSRemoteItemLookup` and
`operationId: apiPostAccountAddByRSSRemoteItemResolve` (near lines 6855 and 6908).

- `security`: add `- {}` as the first entry of both lists (the existing optional-auth pattern,
  for example near line 6746), keeping `bearerAuth`, `cookieAuth`, and `apiKeyAuth`.
- `x-api-key-permission` stays `add_by_rss` / `read`.
- Descriptions, one sentence each. Lookup: "A session is optional; signed-out clients use it to
  match references from a feed they parsed themselves. No rate limit; one request carries at most
  100 references." Resolve: "A session is optional; the rate limit counts per account when signed
  in and per IP address when signed out, each with its own limit."
- Keep the `401` responses (a bad token or a refused API key still answers 401) and resolve's
  existing `429`. Lookup gets no `429`.

## 5. API key route table

`apps/api/src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts` keeps its
resolve row (`REMOTE_ITEM_RESOLVE_BODY`, around lines 101 and 174) unchanged: an API key without
the permission is still refused, because `optionalEnsureAuthenticated` runs the same key check
when a key is sent. Read that test's helpers once to confirm no row asserts "no credentials → 401"
for these two paths; if one does, change that expectation to 200, add the file to this plan's
edits, and say so in the final message.

## Tests

`apps/api/src/test/account-add-by-rss-remote-item.integration.test.ts`:

- `beforeEach`: also `await addByRssRemoteItemResolveRateLimit.resetAddressBudgets()`, beside the
  existing `resetForUser(TEST_USER_ID)`. The suite runs with `isolate: false`, so the in-memory
  address budget would otherwise carry over between cases.
- Rename `'lookup enforces max refs and session auth'` to `'lookup enforces max refs and answers
  signed-out callers'`. The request without `authHeaders` now expects 200 and a `results` array of
  length 1 with `kind: 'channel'` for the seeded directory guid. The 101-ref case keeps 400.
- New `it('resolve answers a signed-out caller for a directory ref without calling the provider')`:
  no auth headers, the seeded directory ref, expect 200 `kind: 'channel'`, and
  `providerMocks.resolveFeed` not called (mirror the existing signed-in directory case).
- New `it('resolve counts signed-out callers per address and signed-in callers per account')`:
  read the cap from `config.rateLimits.accountAddByRssRemoteItemResolveAnon.max` (10 under
  `apiVitest`); send that many signed-out directory-ref resolves, each 200; the next signed-out
  call answers 429 with `tooManyRequests: true`; a signed-in call right after still answers 200.
- New `it('lookup refuses a malformed bearer token')`: an `Authorization: Bearer not-a-token`
  header still answers 401, so optional auth does not mean any token passes.
- `apps/api/src/test/podverse-test-env-startup.test.ts` needs no edit; it covers the new
  `apiVitest` key through `validateStartupRequirements()`.

## Release scratchpad

## Add by RSS remote-item lookup and resolve work signed out

- Surfaces: api, k8s base env
- Change: `POST /account/add-by-rss/remote-item/lookup` and `POST /account/add-by-rss/remote-item/resolve` accept requests without a session. Lookup reads only the directory and remote stub tables and has no rate limit (at most 100 references per request). Resolve counts signed-out callers per IP address against a new `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` (default 120 per minute); signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per account (default 30). The per-address count is kept in each API process's memory. API keys still need `add_by_rss:read`; an invalid token is still refused.
- Who notices: signed-out mobile users, whose Add by RSS feeds are parsed on the device; API consumers can call these routes without a session
- Operator steps: none required; set `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` on the API to change the signed-out resolve budget
