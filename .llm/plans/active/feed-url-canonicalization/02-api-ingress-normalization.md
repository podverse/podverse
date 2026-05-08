# Plan 02 — API ingress normalization

## Scope

Normalize feed URLs at every API ingress path that accepts feed URLs, not only MQ on-demand.

## Key files

- [apps/api/src/controllers/mq/mq.ts](apps/api/src/controllers/mq/mq.ts)
- [apps/api/src/controllers/account/accountAddByRSSParse.ts](apps/api/src/controllers/account/accountAddByRSSParse.ts)
- [apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts](apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts)
- [apps/api/src/test/external-services-and-meta.test.ts](apps/api/src/test/external-services-and-meta.test.ts)

## Steps

1. Keep existing MQ on-demand canonicalization as baseline behavior.
2. Replace `Joi.string().uri().required()` feed URL validation in Add-by-RSS endpoints with Joi
   custom validation that returns canonical URL values.
3. Ensure canonical value is used in:
   - dedupe cache keys
   - queue message payload fields
   - add/update/remove lookup calls in Add-by-RSS channel services
4. Ensure controller responses remain API-contract compatible while using canonical internal values.

## Verification

- `./scripts/nix/with-env npm run test -w apps/api -- src/test/external-services-and-meta.test.ts -t "MQ on-demand"`
- `./scripts/nix/with-env npm run test -w apps/api`

