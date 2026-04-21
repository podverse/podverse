# Phase 02 - API Auth and Rate Limit

## Targets

- `apps/api/src/lib/auth/index.ts`
- `apps/api/src/lib/metaboostMintRateLimit.ts`
- `apps/api/src/lib/rateLimiter.ts`

## Test Intent

- Lock down auth-related normalization/decision behavior that can regress silently.
- Lock down rate-limit response and window behavior expected by clients.

## Planned Test Areas

1. **MetaBoost mint limiter**
   - First consume allowed.
   - Next consume blocked within window.
   - Resets after window passes.
   - 429 response body contains stable fields and sensible minutes rounding.

2. **Shared rate-limit response helper behavior**
   - Verify contract fields in throttled response payload.
   - Verify fallback behavior when reset metadata is absent.

3. **Auth helper behavior**
   - Cover pure helper logic that can be exported safely for deterministic tests.
   - Do not test passport internals.

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api
```
