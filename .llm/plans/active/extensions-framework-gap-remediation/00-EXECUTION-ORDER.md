# Execution order - extensions-framework-gap-remediation

Run in strict order. Each phase removes one blocker and may depend on previous updates.

## Phase order

1. [01-web-e2e-env-stability.md](./01-web-e2e-env-stability.md)
2. [02-web-invalidation-bootstrap-alignment.md](./02-web-invalidation-bootstrap-alignment.md)
3. [03-mgmt-api-secret-response-sanitization.md](./03-mgmt-api-secret-response-sanitization.md)
4. [04-web-csp-propagation.md](./04-web-csp-propagation.md)
5. [05-final-verification-and-archive.md](./05-final-verification-and-archive.md)

## Why this order

- Phase 01 stabilizes the core web E2E signal so later changes can be validated reliably.
- Phase 02 fixes runtime freshness/invalidation behavior for active extensions.
- Phase 03 hardens management-api response safety before final verification.
- Phase 04 completes CSP enforcement wiring and includes targeted tests.
- Phase 05 runs final checks and archives the plan.
