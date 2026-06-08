# Podverse Embed Player — Copy-Pasta

## Execution rules

- Read [`00-SUMMARY.md`](./00-SUMMARY.md) before Phase 1 for locked architecture contracts.
- Run phases in strict sequence: `01` → `02` → `03` → `04` → `05`.
- Do not start the next phase until the previous phase's acceptance criteria are met.
- **Phase 1 → 2 gate:** minimal embed layout, noindex on all `/embed/**`, embed-mode flags, and query
  parser unit tests must be complete before Phase 2.
- Keep scope in `apps/web` unless a phase explicitly references shared request helpers, seed tooling, or docs.

---

## Phase 1 — completed

```text
Read and execute .llm/plans/completed/podverse-embed/01-embed-route-contract-and-runtime-foundations.md

Implement typed embed route shells, minimal embed layout (no app chrome), noindex metadata for all
/embed/** routes, shared embed runtime/query foundations, embed-mode playback guardrails, and parser
unit tests. Do not proceed to Phase 2 until acceptance criteria pass.
```

## Phase 2 — completed

```text
Read and execute .llm/plans/completed/podverse-embed/02-single-embed-ui-and-playback-reuse.md

Implement single embed audio behavior with inline player region, video placeholder, fixed height,
footer layout, embed-mode-safe playback, and data-testid hooks.
```

## Phase 3 — completed

```text
Read and execute .llm/plans/completed/podverse-embed/03-list-embed-loading-and-default-selection.md

Implement public-only list embeds for podcast/album/playlist with route query defaults, default or
play_id_text override selection, and list scroll behavior.
```

## Phase 4 — completed

```text
Read and execute .llm/plans/completed/podverse-embed/04-share-to-embed-builder-modal-and-preview.md

Add Create Embed handoff from Share modal, implement buildEmbedUrl.ts as single source of truth,
embed builder modal with preview/code generation, and fix official-clip URL mapping.
```

## Phase 5 — completed

```text
Read and execute .llm/plans/completed/podverse-embed/05-demo-page-e2e-and-docs.md

Add seed fixtures and constants, finish demo variants on /embed, add split E2E specs, extend SEO
noindex tests for child embed routes, and update docs.
```

---

## Plan set complete

All five phases are archived under `.llm/plans/completed/podverse-embed/`.

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

Operator docs: `docs/features/EMBED-PLAYER.md`.

---

## Plan archival — done

The plan set lives at `.llm/plans/completed/podverse-embed/`.
