# Auth AccountService testability — summary

## Problem

API auth cached `AccountService` in a module singleton while integration tests
each redefine `vi.mock('@podverse/orm')`. The first test file to hit auth pinned a
stale mock instance → flaky failures (e.g. PayPal webhook 401 vs expected 500).

A temporary `resetAccountServiceForIntegrationTests()` export was a band-aid
(test knowledge in production auth).

## Goal

- `getAccountService()` returns `new AccountService()` per lookup (no cache).
- Remove test reset hook and global `setup.ts` reset.
- Document via comment + TODO that auth intentionally differs from controller
  static/module `*Service` patterns; app-wide composition is deferred.

## Non-goals

- Composition root, `startTestApp` overrides, controller migration.
- management-api or Metaboost changes.

## Verification

```bash
npm run test:e2e:api
```
