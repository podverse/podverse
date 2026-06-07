# Podverse Embed gap closure — copy-pasta

## Execution rules

- Read [`00-SUMMARY.md`](./00-SUMMARY.md) before Phase 1.
- Run phases in order: `01` → `02` → `03`.
- Scope stays in `apps/web`, `tools/web/seed-e2e.mjs`, and `docs/**` only if Phase 2 docs need a one-line fixture note.
- Write tests during implementation; do not run them during agent execution.

---

## Phase 1 — completed

```text
Read and execute .llm/plans/completed/podverse-embed-gap-closure/01-playback-guardrail-hardening.md

Wire skipAnonymousPlaybackRestore and skipMainAppLayoutMutations at shared playback/layout
entry points. Add unit tests. Do not change embed UX.
```

## Phase 2 — completed

```text
Read and execute .llm/plans/completed/podverse-embed-gap-closure/02-e2e-matrix-and-fixtures.md

Add seed fixtures for list scroll and non-public channel cases. Complete Phase 5 E2E matrix
gaps in embed-routes, embed-demo-index, and seo-noindex specs. Re-seed before E2E locally.
```

## Phase 3 — completed

```text
Read and execute .llm/plans/completed/podverse-embed-gap-closure/03-share-builder-e2e-and-cleanup.md

Expand embed-share-builder.spec.ts for remaining Share → Builder entity contexts and list
layout toggle. Remove unused EmbedRoutePlaceholder component if still orphaned.
```

---

## Plan set complete

All three phases are archived under `.llm/plans/completed/podverse-embed-gap-closure/`.

## Cumulative verification (after all phases)

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
make e2e_test_web_report_spec SPEC=e2e/seo-noindex-routes.spec.ts
```

Review screenshot reports at `.artifacts/e2e-reports/latest/web/index.html`.
