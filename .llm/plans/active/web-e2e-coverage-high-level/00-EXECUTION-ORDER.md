# Execution order — Podverse web E2E coverage (high-level)

## Order

1. [01-web-route-coverage-high-level.md](./01-web-route-coverage-high-level.md)
2. [02-auth-membership-matrix-high-level.md](./02-auth-membership-matrix-high-level.md)
3. [03-media-network-isolation-high-level.md](./03-media-network-isolation-high-level.md)
4. [04-e2e-orchestration-and-seeding-high-level.md](./04-e2e-orchestration-and-seeding-high-level.md)
5. [05-management-web-parity-high-level.md](./05-management-web-parity-high-level.md)

## Why this order

- Route and state matrices define what to test.
- Media/network policy defines how to keep those tests deterministic.
- Orchestration/seeding defines how to run at scale.
- Management-web parity ensures parallel quality coverage.
