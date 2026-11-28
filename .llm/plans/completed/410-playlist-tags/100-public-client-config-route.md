**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Public client config route

One public GET returns three groups so a later setting is another field on this body. `GET /product/membership` still answers until plan 103 removes it. Pricing, comparison, and the management editor stay.

## Rows

R38

## Runs after

11, 12, 13, 80

Plan 11 supplies `config.playlistTags`. Plans 12 and 13 edit `apps/api/openapi.yml`. Plan 12 also edits `packages/helpers-requests/src/api/_request.ts`. Plan 80 edits `packages/helpers/src/index.ts` and `packages/helpers/package.json`. This route does not call those features. The order keeps each of those files to one writer at a time.

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The path is `GET /config` on the versioned prefix (`config.api.prefix` + `config.api.version`, the same base as `GET /meta`). The helpers path is `/config`. The other path was `GET /product/membership` with a new body, which would break a caller that still expects the membership object at `data`.
- `data.membership` is the object `GET /product/membership` puts on `data` today, not a second `{ data }` wrapper.
- Group names are `membership`, `playlistLimits`, and `instance`. A later setting is a new field on one of these objects, or a new sibling group. It is not a new route.
- Playlist limits are `config.playlistTags` from plan 11. This plan does not parse `PLAYLIST_TAG_MAX_PER_PLAYLIST` or `PLAYLIST_TAG_NAME_MAX_LENGTH` again, and it does not add a second startup check. Plan 11 already refuses a character value above 50 and a count outside 1 through 32767. The numbers in this body are those resolved integers.
- The old route stays in this plan so its current test can prove `data.membership` matches it. Plan 103 removes the route.

## Response

`200` JSON, no auth, `security: []`. Do not add `apiKeyAccess`. A key and a caller with no key both receive the body. Do not add the path to `DENIED_ROUTES` in `apps/api/src/test/api-key-routes-denied.integration.test.ts`.

```json
{
  "data": {
    "membership": {},
    "playlistLimits": { "maxPerPlaylist": 5, "nameMaxLength": 50 },
    "instance": {
      "brandName": "",
      "legalName": "",
      "contactEmail": "",
      "signupMode": "admin_only_email",
      "termsVersion": "",
      "tasteProfileAgreementVersion": "",
      "statsRetentionDays": 90
    }
  }
}
```

`membership` is every field of `ResolvedProductMembership` plus the three values the membership handler adds today:

- `freeTrialDays` = `Math.floor(freeTrialExpirationSeconds / 86400)`
- `monthlyEquivalentAnnually` = `premiumMembershipCostMonthly * 12`
- `annuallySavingsPercent` = `0` when `monthlyEquivalentAnnually` is `0`, otherwise `Math.floor(((monthlyEquivalentAnnually - premiumMembershipCostAnnually) / monthlyEquivalentAnnually) * 100)`

That is the guarded math in `MembershipController.getResolvedProductMembership`. Do not copy the unguarded floor from `getPricing`. Do not change `getPricing` or `getComparison`.

`playlistLimits.maxPerPlaylist` is `config.playlistTags.maxPerPlaylist`. `playlistLimits.nameMaxLength` is `config.playlistTags.nameMaxLength`.

`instance` is read from API config, not from any `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` value:

| Field | Source |
| --- | --- |
| `brandName` | `config.brandName` |
| `legalName` | `config.legal.name` |
| `contactEmail` | `config.terms.contactEmail` (empty string is allowed) |
| `signupMode` | `config.premium.signupMode` |
| `termsVersion` | `config.terms.version` (empty string is allowed) |
| `tasteProfileAgreementVersion` | `config.tasteProfileAgreement.version` |
| `statsRetentionDays` | the same positive integer the terms document interpolates as `{retention_days}` |

Export `resolveStatsTrackEventRetentionDays(): number` from `apps/api/src/lib/legal/termsContent.ts`. `retentionDaysLabel` returns `String(resolveStatsTrackEventRetentionDays())`. The function trims `config.terms.retentionDays`, uses `parseInt` base 10, and keeps the integer when it is finite and greater than 0. Anything else is `DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS` (90). Do not change that parse. Do not add legal address, brand domain, logos, API URLs, or list defaults to this body.

Leave `GET /product/membership`, `GET /product/membership/pricing`, and `GET /product/membership/comparison` mounted. The management editor under `apps/management-web/src/app/(management)/products/memberships/` stays on the management API.

## Shared type

`packages/helpers/src/dtos/config/publicClientConfig.ts`

- `PublicClientConfigMembership` — `ResolvedProductMembership` plus `freeTrialDays`, `annuallySavingsPercent`, and `monthlyEquivalentAnnually`.
- `PublicClientConfigPlaylistLimits` — `maxPerPlaylist` and `nameMaxLength`, both numbers.
- `PublicClientConfigInstance` — the seven fields above. `signupMode` is `AccountSignupMode`.
- `PublicClientConfig` — `{ membership, playlistLimits, instance }`.
- `PUBLIC_CLIENT_CONFIG_TIMEOUT_MS` = `2000`.

Export the type and the timeout from `packages/helpers/src/index.ts`. Add a package subpath `./publicClientConfig` in `packages/helpers/package.json` `exports`, in the same shape as `./listScreenDefaults`, pointing at `dist/dtos/config/publicClientConfig.js` and its `.d.ts`. Mobile cannot import the helpers barrel. The file imports nothing from Node.

## API

Extract `buildPublicMembershipCatalog()` in `apps/api/src/controllers/membership.ts`. It performs the `resolveProductMembership()` call and the three derived numbers, and returns the catalog object. `getResolvedProductMembership` sends `{ data: catalog }` from that function. Do not change the pricing or comparison methods.

New `apps/api/src/controllers/publicClientConfig.ts`, class `PublicClientConfigController`, static `get`. Import `config` from `@api/config/index.js`, the same import `membership.ts` uses. It calls `buildPublicMembershipCatalog()`, reads `config.playlistTags.maxPerPlaylist` and `config.playlistTags.nameMaxLength`, and the instance fields, and `res.json({ data })`. On failure, `handleGenericErrorResponse`. No query and no body. Do not import `apps/api/src/lib/playlistTags.ts`. That module loads tag rows. `config.playlistTags` is the limits object plan 11 adds on API config.

Mount it in `apps/api/src/app.ts` beside the `GET ${baseUrl}/meta` handler:

`app.get(\`${baseUrl}/config\`, asyncHandler(PublicClientConfigController.get))`

`apps/api/openapi.yml` is large. Search `/meta:` and add `/config` immediately after that path. Do not page the file.

- `operationId`: `apiGetConfig`
- `security: []`
- `additionalProperties: false` on `membership`, `playlistLimits`, and `instance`
- `membership` lists these properties, all required: `freeTrialExpirationSeconds`, `premiumMembershipCostMonthly`, `premiumMembershipCostAnnually`, `maxAddByRSSFeeds`, `trialAllowDirectoryAddByRSS`, `trialMaxManualRefreshesPerHour`, `trialTrackStats`, `trialAllowNotifications`, `premiumAllowDirectoryAddByRSS`, `premiumMaxManualRefreshesPerHour`, `premiumTrackStats`, `premiumAllowNotifications`, `freeTrialDays`, `annuallySavingsPercent`, `monthlyEquivalentAnnually`. Copy number and boolean types from `ProductMembershipResponse`.
- `playlistLimits` example is `maxPerPlaylist: 5`, `nameMaxLength: 50`. Describe them as the resolved `PLAYLIST_TAG_MAX_PER_PLAYLIST` and `PLAYLIST_TAG_NAME_MAX_LENGTH`. Do not set `maximum: 5` on the count. The character field's maximum is 50.
- `instance.signupMode` enum is `admin_only_username`, `admin_only_email`, `user_signup_email`.
- One example body. `contactEmail` is `contact@podverse.fm`. Do not invent a person's address.

`packages/helpers-requests/src/api/config/publicClientConfig.ts`

`reqPublicClientConfigGet(api, abort?: AbortOpts)` calls `api.apiRequest<{ data: PublicClientConfig }>` with `path: '/config'`, `method: 'GET'`, and `abort` when the argument is present. `AbortOpts` is `{ controller: AbortController; timeoutMs: number }` from `packages/helpers-requests/src/api/_request.ts`. Import it as a type. Wire the function through `_request.ts` beside `reqProductMembershipGet`: import near line 259, and a class method in the `MEMBERSHIP` section immediately before `reqProductMembershipGet()` (about line 1371):

`reqPublicClientConfigGet(abort?: AbortOpts) { return reqPublicClientConfigGet(this, abort); }`

Leave `reqProductMembershipGet` in place. Do not page `_request.ts`. Search those two anchors.

## Reuse

The membership object is the one `MembershipController.getResolvedProductMembership` already sends. Pricing and comparison stay on that controller. The request helper follows `reqProductMembershipGet` in `packages/helpers-requests/src/api/membership/membership.ts`.

## Do not

- Do not edit plans 10 or 11, the playlist controller, startup validation, `apps/api/.env.example`, `apps/api/ENV.md`, `infra/k8s/base/api/source/api.env`, or `packages/helpers-config/src/podverseTestEnv.ts`. Plan 11 owns the env names, the defaults, and the startup refusal.
- Do not remove `GET /product/membership` in this plan.
- Do not add client env, web callers, or mobile callers. Plans 101 and 102 do that.
- Do not add a process-wide cache. Each request resolves membership again so a management edit shows up on the next call.

## Tests

`apps/api/src/test/public-client-config.integration.test.ts`, same app boot as the Product membership defaults test in `apps/api/src/test/external-services-and-meta.test.ts`.

- `GET /config` with no cookie and no API key returns 200.
- `data.membership` deep-equals `data` from `GET /product/membership` in the same test.
- `data.playlistLimits` is `{ maxPerPlaylist: 5, nameMaxLength: 50 }` (the test env plan 11 sets).
- `data.instance.brandName` equals `config.brandName`.
- `data.instance.signupMode` is one of the three `AccountSignupMode` values and equals `config.premium.signupMode`.
- `data.instance.statsRetentionDays` is a positive integer.
- `data.instance` has the other four strings (`legalName`, `contactEmail`, `termsVersion`, `tasteProfileAgreementVersion`).
- `GET /product/membership/pricing` and `GET /product/membership/comparison` are not called here. Their existing tests stay.

No Playwright spec and no Maestro flow. No new unit test: the integration test is the contract.

## Files

- `packages/helpers/src/dtos/config/publicClientConfig.ts`
- `packages/helpers/src/index.ts`
- `packages/helpers/package.json`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/controllers/publicClientConfig.ts`
- `apps/api/src/lib/legal/termsContent.ts`
- `apps/api/src/app.ts`
- `apps/api/openapi.yml`
- `packages/helpers-requests/src/api/config/publicClientConfig.ts`
- `packages/helpers-requests/src/api/_request.ts`
- `apps/api/src/test/public-client-config.integration.test.ts`

## Release scratchpad

none

Plan 104 appends the one scratchpad entry for this replacement.
