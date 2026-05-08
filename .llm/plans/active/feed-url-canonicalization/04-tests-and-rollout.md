# Plan 04 — Tests and rollout

## Scope

Lock in canonical URL behavior with targeted tests and safe rollout checks.

## Key files

- [apps/api/src/test/external-services-and-meta.test.ts](apps/api/src/test/external-services-and-meta.test.ts)
- [apps/api/src/test](apps/api/src/test)
- [packages/helpers-validation/src/url.test.ts](packages/helpers-validation/src/url.test.ts)
- [packages/helpers-requests/src](packages/helpers-requests/src)
- [packages/parser/src](packages/parser/src)
- [packages/orm/src](packages/orm/src)

## Steps

1. Add or extend API integration tests for:
   - MQ on-demand add/refresh with raw-space URLs
   - Add-by-RSS save/parse/remove with raw-space URLs
2. Add package-level tests for parser/outbound handling with raw-space and encoded URLs.
3. Validate dedupe and lookup behavior remains stable when raw-space input is repeated.
4. Capture rollout checks:
   - existing encoded feeds still parse
   - raw-space feeds can now be added and parsed through all ingestion paths.

## Verification

- `./scripts/nix/with-env npm run test:e2e:api`
- `./scripts/nix/with-env npm run build:packages`
- `./scripts/nix/with-env npm run build -w @podverse/api`

