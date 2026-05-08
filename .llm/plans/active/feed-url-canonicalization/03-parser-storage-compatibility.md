# Plan 03 — Parser and storage compatibility

## Scope

Ensure parser/outbound fetch and storage identity remain safe even if legacy raw-space feed URLs
exist.

## Key files

- [packages/helpers-requests/src/outboundHttpPolicy.ts](packages/helpers-requests/src/outboundHttpPolicy.ts)
- [packages/parser/src/lib/rss/parser.ts](packages/parser/src/lib/rss/parser.ts)
- [packages/parser/src/lib/rss/addByRSS.ts](packages/parser/src/lib/rss/addByRSS.ts)
- [packages/orm/src/services/feed/feed.ts](packages/orm/src/services/feed/feed.ts)
- [packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts](packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts)

## Steps

1. Add parser-side defensive normalization before outbound validation/fetch for feed URLs.
2. Confirm canonical URL is written when feed records are created or updated.
3. Add compatibility lookups where identity currently depends on exact string equality and could
   hit raw-space legacy data.
4. Define migration strategy for existing rows:
   - optional backfill from raw-space to canonical form
   - conflict handling if canonical duplicates exist
5. Keep canonical format as durable DB representation going forward.

## Verification

- `./scripts/nix/with-env npm run test -w @podverse/helpers-requests`
- `./scripts/nix/with-env npm run test -w @podverse/parser`
- `./scripts/nix/with-env npm run test -w @podverse/orm`

