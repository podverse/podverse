# Phase 03 - Parser and Ingestion Rules

## Targets

- `packages/parser/src/lib/rss/parser.ts`
- `packages/orm/src/services/feed/feedFlagStatus.ts`
- `packages/orm/src/services/feed/feed.ts` (targeted helper behavior only)

## Test Intent

- Prevent parser regressions in ingestion allow/deny paths.
- Lock down feed spam/flag threshold behavior.
- Cover core normalization and boundary behavior with deterministic tests.

## Planned Test Areas

1. **Feed flag status parse policy**
   - Allowed statuses parse.
   - Blocked statuses do not parse.

2. **Spam classification thresholds**
   - Boundary values around item count and live-item count.

3. **Parser helper guardrails**
   - Stable expected behavior for key pure or near-pure logic.

## Verification

```bash
./scripts/nix/with-env npm run test -w packages/parser
./scripts/nix/with-env npm run test -w packages/orm
```
