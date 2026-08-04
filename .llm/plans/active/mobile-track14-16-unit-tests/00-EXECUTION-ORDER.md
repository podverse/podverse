# Execution order — mobile-track14-16-unit-tests

Run COPY-PASTA prompts **1 → 2** in order (independent, but keep the `vitest.config.ts` `include`
edits from colliding). Archive the set when both are done.

## Steps

1. **01** — Deep-link path map tests + pure notification-target extraction + tests (15.3, 14.4/14.8).
2. **02** — Pure share-URL core + tests (15.5); prefs store guard/hydrate tests (16.1).

## Parallelism

Low risk to run together, but both edit `apps/mobile/vitest.config.ts` `include`; if run in parallel,
re-merge the array. Prefer sequential.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md`.
- Do **not** run tests during agent work; operator verifies at the end.
- No master-plan status changes (these steps are already `done`; this set only adds test coverage).
