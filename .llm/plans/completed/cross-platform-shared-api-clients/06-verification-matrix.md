# Verification matrix

This matrix defines recommended verification checkpoints for each rollout phase.

## Phase 2 verification

- Lint and package build:

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
```

- Optional targeted web regression if request-helper behavior changed materially:

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```

## Phase 3 verification

- Integration tests for API surfaces:

```bash
./scripts/nix/with-env npm run test:e2e:api
```

- Management-web scoped E2E:

```bash
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```

## Phase 4 verification

- Integration tests:

```bash
./scripts/nix/with-env npm run test:e2e:api
```

- Cross-app smoke (cookie + session impact):

```bash
make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts
```

## Phase 5 verification (mobile token endpoint work)

- API integration tests:

```bash
./scripts/nix/with-env npm run test:e2e:api
```

- Cross-app smoke to catch auth/session regressions:

```bash
make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts
```

## Exit criteria checklist

- [ ] Both client packages build and publish in workspace
- [ ] Web and management-web consume package clients without app-local transport forks
- [ ] Cookie auth flow remains stable in both web apps
- [ ] Bearer constructor path is documented and test-covered
- [ ] Mobile token endpoints are implemented, documented, and integration-tested
- [ ] Rotating refresh token behavior (rotation + reuse denial) is integration-tested
- [ ] No new lint/type errors introduced by package extraction
