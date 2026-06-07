# Podverse Embed Player — 00 Execution Order

## How to use this plan set

1. Read [`00-SUMMARY.md`](./00-SUMMARY.md) for locked architecture, playback, URL, and visibility contracts.
2. Execute numbered files in order (`01` → `05`).
3. Keep scope constrained to `apps/web` for this phase.
4. Reuse existing player architecture under embed-mode guardrails.
5. Add tests during implementation; do not run them during agent execution.
6. **Do not start Phase 1** until this tightened plan set is in place (prerequisite for execution).

## Phase table

| # | Phase | Outcome |
| --- | --- | --- |
| 1 | Route contract + runtime foundations | Minimal embed layout, noindex, query parser + unit tests, embed-mode flags |
| 2 | Single embed UI + playback reuse | Inline audio single embed, video placeholder, footer, test hooks |
| 3 | List embed loading + default selection | Public-only list embeds, route query tables, default/`play_id_text` selection |
| 4 | Share → embed builder modal | Canonical URL builder, modal handoff, preview + iframe code |
| 5 | Demo page + tests + docs | Seed fixtures, split E2E specs, docs, child-route SEO checks |

## Dependency notes

- Phase 1 is prerequisite for all later phases.
- **Phase gate:** Phase 1 acceptance criteria (layout, noindex, embed-mode, parser tests) must pass
  before starting Phase 2.
- Phase 2 and 3 both depend on shared runtime/query contracts from Phase 1.
- Phase 3 depends on Phase 2 inline player region pattern.
- Phase 4 depends on route contract, `buildEmbedUrl.ts`, and embed surfaces from Phases 1–3.
- Phase 5 depends on all prior phases; seed fixture prerequisites must land before E2E specs.

## Phase transition checklist

Before moving to the next phase, confirm the prior phase's **Acceptance criteria** section is satisfied
at plan-doc level (implementation complete, tests written but not necessarily run by agent).

## File order

- [`01-embed-route-contract-and-runtime-foundations.md`](./01-embed-route-contract-and-runtime-foundations.md)
- [`02-single-embed-ui-and-playback-reuse.md`](./02-single-embed-ui-and-playback-reuse.md)
- [`03-list-embed-loading-and-default-selection.md`](./03-list-embed-loading-and-default-selection.md)
- [`04-share-to-embed-builder-modal-and-preview.md`](./04-share-to-embed-builder-modal-and-preview.md)
- [`05-demo-page-e2e-and-docs.md`](./05-demo-page-e2e-and-docs.md)

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for execution prompts.
