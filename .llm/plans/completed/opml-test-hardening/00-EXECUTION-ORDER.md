# Execution order — OPML Test Hardening

Plans are independent and may be executed in any order, but the recommended order is:

1. `03-opml-counter-reset-e2e-determinism.md` — small infra change that also de-risks 01/02 reruns.
2. `01-http-429-burn-in.md` — API-only, no broker needed.
3. `02-artemis-worker-integration.md` — heaviest; needs a broker in the harness.

Each plan is self-contained and lists its own operator verification commands. On the plan that
completes the **last** prompt in this set, end with the cumulative verification block (see
`COPY-PASTA.md`).

## Constraints

- Do not run tests during implementation; only add/adjust them. Provide operator verify commands.
- Do not run `npm install` / `npm ci` autonomously (native-deps-platform-mismatch skill); if Vitest
  fails with a missing darwin binary, surface it and ask the operator to run `npm install`.
- Keep each plan file under 300 lines.
