# Execution order — mobile-auth-nav-tech-debt

Phases are **sequential**. Within a phase, follow the stated parallel/serial rules.

## Phase 1 — Auth session correctness (must be first)

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 1 | [01-auth-bootstrap-and-account-hydrate.md](./01-auth-bootstrap-and-account-hydrate.md) | Sequential alone |

Touching `AuthProvider` / login path. Do not start Phase 2 until this is done.

## Phase 2 — Docs + entry hygiene (parallel OK)

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 2a | [02-docs-and-env-consistency.md](./02-docs-and-env-consistency.md) | In parallel with 2b |
| 2b | [03-mobile-entry-and-import-hygiene.md](./03-mobile-entry-and-import-hygiene.md) | In parallel with 2a |

Docs-only vs small app entry/import changes — no shared file conflicts expected.

## Phase 3 — Polish (optional / last)

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 3 | [04-signup-i18n-and-health-fetch.md](./04-signup-i18n-and-health-fetch.md) | After Phase 2 |

Can defer if shipping pressure; not required for auth correctness.

## Operator verify (after all pasted prompts)

Agents do **not** run tests. After the set (or after Phase 1 alone if shipping early), operator runs
focused Maestro auth flows. See final cumulative block in `COPY-PASTA.md`.
