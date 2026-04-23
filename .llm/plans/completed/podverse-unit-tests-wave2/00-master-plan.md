# Podverse Unit Tests — Wave 2 (Breadth)

## Decision (Wave 2 vs Wave 1 only)

**Wave 1** delivered **confident, narrow** coverage (high-risk pure logic and small helpers). That remains a sound baseline.

**Wave 2** adds **breadth** without abandoning discipline: more tests where regressions are costly (workers bootstrap mapping, ORM feed URL/parsing windows, optional API-route integration, helpers expansion, web hooks/utils). Same stop rules as Wave 1: stop when marginal tests duplicate signal.

## Goals

- Increase test **surface area** where ROI is clear.
- Prefer **pure extractions** + thin tests over full-stack mocks.
- Keep tests **fast and deterministic**.

## Stop line

- Do not chase line coverage percentages.
- Stop when additional cases mostly validate libraries or repeat existing assertions.
- Prefer integration/E2E only where unit tests require unjustified scaffolding.

## Execution order

1. `01-workers-core-jobs.md`
2. `02-api-route-smoke-integration.md`
3. `03-orm-feed-lock-and-claim-branches.md`
4. `04-helpers-package-expansion.md`
5. `05-web-hooks-business-logic.md`
6. `06-wave2-verification-and-archive.md`

## Verification (full monorepo)

```bash
./scripts/nix/with-env npm run test
./scripts/nix/with-env npm run lint
```
