# Route Navigation Loading Warning - Execution Order

## Phase 1 (sequential)

1. Execute `01-shared-hook-deferral-fix.md`.
2. Wait for completion and verify unit-level updates are included.

## Phase 2 (sequential)

1. Execute `02-navigation-loading-e2e-coverage.md`.
2. Wait for completion and ensure both web and management-web E2E coverage is
   updated.

## Notes

- Phases are sequential; do not start Phase 2 until Phase 1 is complete.
- This plan set intentionally starts with the minimal behavioral fix in shared
  UI and then adds test hardening.
