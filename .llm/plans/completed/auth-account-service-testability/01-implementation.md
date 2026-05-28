# 01 — Implementation

## Files

- `apps/api/src/lib/auth/index.ts`
- `apps/api/src/test/setup.ts`
- `apps/api/src/test/paypal.test.ts` (optional mock cleanup)

## Steps

1. Auth: per-call `new AccountService()`, remove singleton + reset export, add TODO comment.
2. setup.ts: remove `beforeEach` reset of account service.
3. Grep: zero `resetAccountServiceForIntegrationTests`.
4. Run `npm run test:e2e:api`.

## Exit criteria

See [`00-SUMMARY.md`](./00-SUMMARY.md).
