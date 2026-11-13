**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 62 — Read the default and the account's Add by RSS limit

The device needs two numbers from the server:

- **The default limit**, before any account exists. The public `GET /product/membership`
  (`security: []`, no session) already spreads the resolved product membership into its
  response, so after plan 60 it returns `maxAddByRSSFeeds`. This plan **reuses that route** and
  adds no public route. It documents the field and types it on the client.
- **The signed-in account's own limit** (its override, or the default). No route returns that
  today: `GET /account` uses `skipMembershipStatus: true`, so it never resolves entitlements.
  This plan adds `GET /account/add-by-rss/feed-limit`.

Both readers live in `apps/mobile/src/lib/addByRss/feedLimit.ts` and return `null` when the
server cannot answer.

## Rows

R30, R31

## Runs after

60

## Files

apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts
apps/api/src/routes/account.ts
apps/api/openapi.yml
apps/api/src/test/account-follows-notifications.test.ts
apps/api/src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts
apps/api/src/lib/docs/openapiApiKeyPermissions.test.ts
packages/helpers-requests/src/api/membership/membership.ts
packages/helpers-requests/src/api/account/addByRSSFeedLimit.ts (new)
packages/helpers-requests/src/api/_request.ts
apps/mobile/src/lib/addByRss/feedLimit.ts (new)
apps/mobile/src/lib/addByRss/feedLimit.test.ts (new)
release-notes/scratchpad.md

## 1. Public default: document what `GET /product/membership` returns

- `apps/api/openapi.yml`, `components.schemas.ProductMembershipResponse` (search
  `ProductMembershipResponse:`): add a `maxAddByRSSFeeds` property (integer, minimum 0,
  description "Default Add by RSS feed limit shared by Trial and Premium. An account's own limit
  can differ; read it from GET /account/add-by-rss/feed-limit."). Keep `additionalProperties`
  as it is. Do not change the route or its controller.
- `packages/helpers-requests/src/api/membership/membership.ts`: add
  `maxAddByRSSFeeds: number` to `ProductMembershipCatalog`. `reqProductMembershipGet` is
  unchanged. The web checkout and the mobile store checkout read only the price fields and need
  no edit.

## 2. Account limit route

Controller, in `AccountFollowingAddByRSSChannelController`
(`apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`), a new static method
`getAddByRSSFeedLimit(req, res)`:

- `ensureAuthenticated(req, res, handler, { skipMembershipStatus: false, apiKeyAccess: { resource: 'add_by_rss', action: 'read' } })`.
  Membership is enforced so `passesAccountGates` sets `user.entitlements`; a lapsed account gets
  the existing `membership_expired` 403, like every add-by-RSS write.
- The handler reads `getAuthenticatedUser(req).entitlements`. When it is undefined, call
  `handleGenericErrorResponse(res, new Error('Entitlements were not resolved'))`. Otherwise
  `res.status(200).json({ data: { maxAddByRSSFeeds: entitlements.maxAddByRSSFeeds } })`.
- No rate limit wrapper; the route reads one resolved number.

Route, in `apps/api/src/routes/account.ts`, beside the other `/add-by-rss/…` routes (after
`router.post('/add-by-rss/parse/all', …)`):

```ts
router.get(
  '/add-by-rss/feed-limit',
  asyncHandler(AccountFollowingAddByRSSChannelController.getAddByRSSFeedLimit)
);
```

OpenAPI (**openapi-sync**, **api-key-route-access**): a new path
`/account/add-by-rss/feed-limit` with `get`, copying the shape of
`/account/add-by-rss/parse/status/{request_id}` (search that path): `operationId:
apiGetAccountAddByRssFeedLimit`, tag `account`, the same three `security` entries,
`x-api-key-permission: { resource: add_by_rss, action: read }`, no parameters. Description:
"The signed-in account's Add by RSS feed limit: its override, or the shared default. Authenticated
endpoint (cookieAuth or bearerAuth). An API key needs add_by_rss read." Responses: `200` with a
new schema `ApiGetAccountAddByRssFeedLimitResponse200` (`data` object, required
`maxAddByRSSFeeds` integer minimum 0), `401` `AuthenticationErrorResponse`, `403`
`AuthorizationErrorResponse` (membership expired or terms not accepted). Put the new schema next
to `ApiGetAccountAddByRssParseStatusRequestIdResponse200`.

## 3. Request method

New file `packages/helpers-requests/src/api/account/addByRSSFeedLimit.ts`, in the shape of
`addByRSSChaptersTranscript.ts`:

```ts
import type { ApiRequestService } from '../_request.js';

export type ReqAccountAddByRSSFeedLimitResponse = {
  data: { maxAddByRSSFeeds: number };
};

export async function reqAccountAddByRSSFeedLimitGet(api: ApiRequestService) {
  return api.apiRequest<ReqAccountAddByRSSFeedLimitResponse>({
    path: '/account/add-by-rss/feed-limit',
    method: 'GET',
    config: { withCredentials: true },
  });
}
```

Register it in `packages/helpers-requests/src/api/_request.ts` the way
`reqAccountAddByRSSChaptersTranscript` is: the function import near line 50, the type re-export
near line 376, and a class method `reqAccountAddByRSSFeedLimitGet()` next to the
`reqAccountAddByRSSChaptersTranscript` method (near line 871).

## 4. Mobile readers

New file `apps/mobile/src/lib/addByRss/feedLimit.ts`. Both functions catch every error and return
`null`, so offline mode, an unreachable server, a 401, or a 403 all read as "unknown". A value
that is not a non-negative integer is also `null`.

```ts
import type { MobileAuthRequestContext } from '../../data/repositories/types';
```

- `fetchAddByRssDefaultFeedLimit(): Promise<number | null>` — calls
  `requestWithoutMobileAuth((api) => api.reqProductMembershipGet())` from
  `../../auth/authRequestWithRefresh` and returns `response.data.maxAddByRSSFeeds`. Sends no
  bearer and never touches the session.
- `fetchAccountAddByRssFeedLimit(context: MobileAuthRequestContext): Promise<number | null>` —
  calls `requestWithMobileAuthRefreshIfSignedIn(context, (api) => api.reqAccountAddByRSSFeedLimitGet())`
  and returns `response.data.maxAddByRSSFeeds`, or `null` when the helper returns `null`
  (signed out). Every authenticated mobile request goes through that helper
  (**mobile-auth-refresh-terminates**), and it needs the caller's auth context, so this reader
  takes one. Callers pass the same `{ accessToken, clearSession, refreshToken, setTokens }`
  object they pass to `addByRssRepository.parseNow`.

Add a file comment of two or three lines: what each function reads, and that `null` means the
server did not answer. No caching; each call reads the server, since the limit can change
without a release.

## Tests

- `apps/api/src/test/account-follows-notifications.test.ts`: a new
  `describe('GET /add-by-rss/feed-limit'` after the `POST /follow/add-by-rss-channel` block, with
  `returns 200 with the account's resolved limit` (assert `res.body.data.maxAddByRSSFeeds` is the
  number the file's cap-defaults mock resolves, or the override when the account mock carries
  `max_add_by_rss_feeds`) and `returns 401 without auth`. Use the file's existing auth helpers
  and mocks; add a cap-defaults mock only if the file has none.
- `apps/api/src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts`: add
  `route('get', '/account/add-by-rss/feed-limit', 'add_by_rss', 'read')` to the route table, next
  to the `parse/status` entry.
- `apps/api/src/lib/docs/openapiApiKeyPermissions.test.ts`: add
  `['get', '/account/add-by-rss/feed-limit', 'read']` to the `add_by_rss` list, after the
  `parse/status` entry.
- `apps/mobile/src/lib/addByRss/feedLimit.test.ts` (jest; mock
  `../../auth/authRequestWithRefresh`): the default reader returns the number; returns `null`
  when the request throws (offline or network); returns `null` for a negative or non-integer
  value. The account reader returns the number; returns `null` when the helper returns `null`;
  returns `null` when the request throws a 403-shaped error.
- No Maestro flow and no Playwright spec. Nothing on screen reads these yet; areas C and G and
  plan 64 call them, and plan 64's flow covers the account reader on screen.

## Release scratchpad

```markdown
## API returns the Add by RSS limit for the device and the signed-in account

- Surfaces: api, mobile
- Change: `GET /product/membership` (public) documents `maxAddByRSSFeeds`, the default Add by RSS limit shared by Trial and Premium. New authenticated `GET /account/add-by-rss/feed-limit` returns `{ data: { maxAddByRSSFeeds } }` for the signed-in account: its per-account override, or the default. An API key needs `add_by_rss` read. A lapsed membership gets the usual membership-expired 403. The mobile app reads both numbers from the server, so a limit change needs no app release.
- Who notices: API clients; mobile users indirectly, through the sign-up and limit flows that use these numbers
- Operator steps: none
```
