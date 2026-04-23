# 15 — Verification and Archive

## Goal

Run the full API test suite to verify all new tests pass together, then archive the plan set.

## Steps

### 1. Run full API test suite

```bash
./scripts/nix/with-env npm run test:e2e:api
```

This runs both `apps/api` and `apps/management-api` test suites. Verify all tests pass.

### 2. Run lint

```bash
./scripts/nix/with-env npm run lint
```

Verify no lint errors introduced.

### 3. Verify individual test files pass

If the full suite has issues, run individual files to isolate:

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/auth.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/account.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-devices.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-follows-notifications.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-settings.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/clip.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/playlist.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/queue.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/category-channel-item-read.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/external-services-and-meta.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/paypal.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/profile-content.test.ts
./scripts/nix/with-env npm run test -w apps/management-api
```

### 4. Verify existing tests still pass

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/stats.track.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/env.smoke.test.ts
```

### 5. Archive plan set

Move `.llm/plans/active/api-integration-tests/` to `.llm/plans/completed/api-integration-tests/`.
