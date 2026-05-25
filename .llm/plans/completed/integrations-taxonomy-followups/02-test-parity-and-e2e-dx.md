# Plan 02 — Test parity and E2E DX (optional)

## Objective

Close minor gaps from plan 13 review — **not** production blockers.

## Non-goals

- API integration tests for trace response headers (covered by `@podverse/observability` unit tests)
- Full `make e2e_test_report`

---

## 1. Web `runtime-config-store` tests

Plan 13 listed `apps/web` alongside management-web for `runtime-config-store` preserving `integrations`.

Management-web has [`runtime-config-store.test.ts`](../../../apps/management-web/src/config/runtime-config-store.test.ts). Add mirror under [`apps/web/src/config/runtime-config-store.test.ts`](../../../apps/web/src/config/runtime-config-store.test.ts):

- Fallback `integrations` when global unset
- Preserves `integrations` from `setRuntimeConfig`
- Enabled Cloudflare token round-trip

Follow existing web vitest config / test patterns in the app.

---

## 2. Cloudflare enabled E2E npm scripts

Configs exist:

- [`apps/web/playwright.cloudflare-web-analytics-enabled.config.ts`](../../../apps/web/playwright.cloudflare-web-analytics-enabled.config.ts)
- [`apps/management-web/playwright.cloudflare-web-analytics-enabled.config.ts`](../../../apps/management-web/playwright.cloudflare-web-analytics-enabled.config.ts)

Add to each app `package.json` (mirror storage-enabled pattern):

```json
"test:e2e:cloudflare-enabled": "playwright test -c playwright.cloudflare-web-analytics-enabled.config.ts"
```

Document in [`docs/operations/INTEGRATIONS-WEB.md`](../../../docs/operations/INTEGRATIONS-WEB.md) verification section (one line).

---

## 3. E2E spec order (optional)

Append to:

- [`makefiles/local/e2e-spec-order-web.txt`](../../../makefiles/local/e2e-spec-order-web.txt)
- [`makefiles/local/e2e-spec-order-management-web.txt`](../../../makefiles/local/e2e-spec-order-management-web.txt)

Entry: `cloudflare-web-analytics-integration.spec.ts` (disabled path runs in default config).

---

## 4. Lockfile hygiene

Remove extraneous `packages/extension-sdk` stanza from root `package-lock.json` if still present after `npm install` from repo root (rename leftover from plan 02).

```bash
./scripts/nix/with-env npm install
# Commit lockfile if diff shows removal of extraneous extension-sdk
```

---

## 5. Verification

```bash
./scripts/nix/with-env npm run test:unit
./scripts/nix/with-env npm run test:e2e:cloudflare-enabled -w @podverse/web
./scripts/nix/with-env npm run test:e2e:cloudflare-enabled -w @podverse/management-web
```

User disabled-path E2E (unchanged):

```bash
make e2e_test_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/cloudflare-web-analytics-integration.spec.ts
```

---

## Acceptance checklist

- [ ] Web runtime-config-store tests pass
- [ ] Enabled Cloudflare E2E runnable via npm script
- [ ] Lockfile has no extraneous `extension-sdk` package entry
