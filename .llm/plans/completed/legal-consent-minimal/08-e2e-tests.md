# Phase 8 — E2E tests + final verification

## Goal

Automated coverage for legal UX paths. Use make targets only.

## New E2E specs (`apps/web/e2e/`)

### `cookie-consent-disabled.spec.ts`

- Default Playwright config (banner env off)
- Home loads; no cookie banner element
- Matches pattern of `cloudflare-web-analytics-disabled.spec.ts`

### `cookie-consent-enabled.spec.ts`

- New Playwright config overlay (like
  `playwright.cloudflare-web-analytics-enabled.config.ts`) setting:
  - `NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED=true`
  - Cloudflare integration enabled (reuse existing enabled config pattern)
- Tests:
  1. Banner visible with three buttons on first visit
  2. Accept all → banner hidden; `#cloudflare-web-analytics` present
  3. Fresh context + Essential only → banner hidden; beacon absent

Use `local-settings` cookie seeding or click through banner per
`e2e-readability` skill.

### `sign-up-legal-consent.spec.ts`

- Signup page: cannot submit without ToS checkbox
- With ToS checked + listen-stats checked → account created
- API or UI assertion that preference was stored (if test user can log in)

### `terms-version-acceptance.spec.ts`

- Seed or mock account with outdated `account_terms_acceptance` (or use
  test API helper if available)
- Log in → blocking modal visible
- Accept → modal gone; can navigate app

Follow `e2e-screenshot-verified-element` for banner/modal assertions.

## Playwright config

- Add `playwright.cookie-consent-enabled.config.ts` if needed
- Wire into `make e2e_test_web` only if repo convention requires full
  matrix; otherwise document scoped make target:

```bash
make e2e_test_web_report_spec SPEC=e2e/cookie-consent-enabled.spec.ts
```

## CI / Makefile

If new config needed, update `makefiles/local/Makefile.local.e2e.mk` to
include cookie-consent-enabled run alongside cloudflare-enabled (mirror
existing dual-config pattern).

## Final checklist

- [ ] `./scripts/nix/with-env npm run lint`
- [ ] `./scripts/nix/with-env npm run build:packages`
- [ ] `./scripts/nix/with-env npm run test:e2e:api`
- [ ] `./scripts/nix/with-env npm run openapi:check`
- [ ] E2E specs above (scoped make commands)
- [ ] k8s + GitOps env committed; remind push to Argo branch

## Verification commands

```bash
make e2e_test_web_report_spec SPEC=e2e/cookie-consent-disabled.spec.ts
make e2e_test_web_report_spec SPEC=e2e/cookie-consent-enabled.spec.ts
make e2e_test_web_report_spec SPEC=e2e/sign-up-legal-consent.spec.ts
make e2e_test_web_report_spec SPEC=e2e/terms-version-acceptance.spec.ts
```

After all phases: move plan-set to `completed/` per COPY-PASTA.
