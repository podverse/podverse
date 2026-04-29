# Podverse web E2E coverage (high-level) — master

This plan set defines a broad, confidence-oriented E2E expansion strategy for Podverse, with emphasis on web features and state-dependent behavior.

## Scope

- High-level planning only (no spec implementation in this pass).
- Coverage planning across as many web pages and flows as practical.
- Explicit behavior matrix for:
  - logged-out
  - logged-in
  - membership-related states
- Third-party network isolation for media and images in primary E2E runs.
- Management-web parity planning to avoid admin-side coverage gaps.

## Plan map

1. [01-web-route-coverage-high-level.md](./01-web-route-coverage-high-level.md)
2. [02-auth-membership-matrix-high-level.md](./02-auth-membership-matrix-high-level.md)
3. [03-media-network-isolation-high-level.md](./03-media-network-isolation-high-level.md)
4. [04-e2e-orchestration-and-seeding-high-level.md](./04-e2e-orchestration-and-seeding-high-level.md)
5. [05-management-web-parity-high-level.md](./05-management-web-parity-high-level.md)

## References

- `apps/web/src/constants/routes.ts`
- `apps/web/src/app/membership/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/playwright.config.ts`
- `apps/web/playwright.e2e-webservers.ts`
- `makefiles/local/Makefile.local.e2e.mk`
- Metaboost model: `../metaboost` equivalents for E2E structure and reporting
