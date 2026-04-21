# Wave 2 — ORM Feed URL / Parsing Window + Membership Claim Guards

## Targets

- [packages/orm/src/services/feed/feed.ts](packages/orm/src/services/feed/feed.ts)
- [packages/orm/src/services/membershipClaimToken.ts](packages/orm/src/services/membershipClaimToken.ts)

## Intent

Wave 1 covered dedupe helpers and membership **date math** helpers. Wave 2 fills:

1. **Feed URL normalization** logic used by `getByUrl` (https/http candidate URLs) — extract pure helpers and unit test.
2. **Parsing stale cutoff** math for `tryStartParsing` — extract `computeParsingStaleBefore(now, maxParsingAgeMinutes)` and test boundaries.
3. **MembershipClaimToken.claim** early errors — optional service-level tests with mocked repositories (account missing, token missing, already claimed).

## Planned tests

- URL: strip scheme, build https + http candidates, edge empty string.
- Stale window: 0 minutes, default 15, negative clamp if applicable.
- Claim: three throw paths when mocks return null/claimed.

## Verification

```bash
./scripts/nix/with-env npm run test -w packages/orm
```
