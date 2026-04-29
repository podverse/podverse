# 04 — E2E orchestration and seeding (high-level)

## Goal

Scale Podverse E2E execution to support broad coverage with deterministic setup and efficient debugging.

## Strategy

1. Seed tiers
- Base user/auth fixtures
- Membership-state fixtures
- Content fixtures for lists/detail pages
- Add-by-RSS fixtures
- Media fixture metadata

2. Run modes
- Baseline mode for core web and management-web suites.
- Additional state-specific modes if needed for auth/membership variants.

3. Reporting
- Keep full-suite report targets.
- Keep scoped report-by-spec targets for fast debugging.
- Keep conceptual spec ordering files updated.

4. API gate policy
- Define when API integration tests gate Playwright execution.

## References

- `makefiles/local/Makefile.local.e2e.mk`
- `makefiles/local/e2e-spec-order-web.txt`
- `makefiles/local/e2e-spec-order-management-web.txt`
- `tools/web/seed-e2e.mjs`
- `tools/management-web/seed-e2e.mjs`
