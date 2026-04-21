# Wave 2 — Helpers Package Expansion

## Targets

- [packages/helpers/src/lib/](packages/helpers/src/lib/)

## Intent

Add **table-driven** tests for exported helpers not yet covered, prioritizing:

- Time/duration helpers with branchy parsing ([timeConstants.ts](packages/helpers/src/lib/timeConstants.ts)) — only where not already exercised elsewhere.
- Risk-prone string/URL helpers.

## Guardrails

- Do not duplicate tests already in `*.test.ts` files (e.g. jwt duration cases covered from API auth policy tests may be enough).
- One happy + one failure + one edge per function maximum unless risk demands more.

## Verification

```bash
./scripts/nix/with-env npm run test -w packages/helpers
```
