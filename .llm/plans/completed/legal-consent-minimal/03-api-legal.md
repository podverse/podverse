# Phase 3 — API: signup, accept-terms, listen-stats, stats gate

## Goal

Server-side legal contracts and enforcement for listen-stats tracking.

## Endpoints

### `POST /account` (extend)

Body additions:

```json
{
  "email": "...",
  "password": "...",
  "locale": "en-US",
  "terms_version": "2026-05-28",
  "allow_listen_stats": true
}
```

- Joi: `terms_version` required string max 64
- Validate `terms_version === config.terms.version` (reject mismatch 400)
- `allow_listen_stats` optional boolean, default `true`
- On create: insert `account_terms_acceptance`; set `account_settings.allow_listen_stats`

### `POST /account/accept-terms` (new)

- Authenticated
- Body: `{ terms_version: string }`
- Validate version matches current config
- Upsert `account_terms_acceptance`
- 201 on success

### Listen-stats toggle

Prefer extending existing account settings PATCH if one exists; otherwise
`PATCH /account/settings/listen-stats` with `{ allow_listen_stats: boolean }`.

- Authenticated only
- Updates `account_settings.allow_listen_stats`

### `GET /auth/me`

- Add `account_terms_acceptance` to `privateRelations` in
  `AccountController.getLoggedInAccount`
- Ensure `account_settings.allow_listen_stats` is loaded

## Stats gate

In each `StatsTrackEvent*Controller.create`:

1. Existing `trackStats` entitlement check (keep)
2. **New:** load account settings; deny (403) if `allow_listen_stats === false`

Extract shared helper e.g. `assertListenStatsAllowed(accountId)` to avoid
duplication across five controllers.

## helpers-requests

- Extend `reqAccountCreate` with `terms_version`, optional `allow_listen_stats`
- Add `reqAccountAcceptTerms`, `reqAccountUpdateListenStats` (names per convention)

## OpenAPI

Update `apps/api/openapi.yml`:

- `POST /account` request body
- `POST /account/accept-terms` operation
- Settings/listen-stats operation
- Schemas: `AccountTermsAcceptance`, settings field

Run `./scripts/nix/with-env npm run openapi:check`.

## Integration tests

`apps/api/src/test/account.test.ts`:

- Signup without `terms_version` → 400
- Signup with wrong version → 400
- Signup success creates acceptance row

`apps/api/src/test/stats.track.test.ts` (or new file):

- Stats POST returns 403 when `allow_listen_stats=false`

`apps/api/src/test/account-accept-terms.test.ts` (new, if cleaner)

## Data export

`AccountDataExportService.exportUserData` — include:

```typescript
account_terms_acceptance: { terms_version, accepted_at } | null;
allow_listen_stats: boolean;
```

Update `packages/helpers` export DTO.

## Exit criteria

- All API tests pass
- OpenAPI check green
- Stats blocked when user opts out

## Verification

```bash
make test_deps
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm run openapi:check
```
