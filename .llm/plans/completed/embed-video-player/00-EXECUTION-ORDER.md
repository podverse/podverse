# Embed Video Player — 00 Execution Order

## How to use this plan set

1. Read [`00-SUMMARY.md`](./00-SUMMARY.md) for locked decisions, query contracts, and feasibility notes.
2. Execute numbered files in order (`01` → `06`).
3. Scope: `apps/web` (plus docs under `docs/features/`).
4. Reuse existing playback stack (`NonLiveMediaOrchestrator`, embed guardrails).
5. Keep `_embedLayoutTokens.scss` and `embedLayoutTokens.ts` in sync on every height change.
6. Add tests during implementation; do not run them during agent execution.
7. Follow skills: `feature-implementation-testing`, `e2e-page-tests`, `css-custom-properties-no-var-fallbacks`,
   `styles-source-of-truth`, `reusable-components`.

## Phase table

| # | Phase | Outcome |
| - | ----- | ------- |
| 1 | Layout tokens + responsive single | `ar` param, aspect-ratio CSS vars, responsive iframe wrapper, single video stage shell |
| 2 | Video media mount + playback | Inline video / audio+art mount; enable video playback load; content-ready fix |
| 3 | Video overlays + chapter UX | Info/controls overlays, auto-hide, chapter title line, progress popover for video |
| 4 | List row count + fixed video+list | `rows` param (2–10), builder control, deterministic list+video heights |
| 5 | Auto-resize advanced (opt-in) | Secure postMessage resize, builder advanced toggle + listener snippet |
| 6 | Tests, E2E, docs | Unit tests, Playwright specs, `EMBED-PLAYER.md` update |

## Dependency notes

- Phase 1 is prerequisite for all later phases (tokens + aspect-ratio box).
- Phase 2 depends on Phase 1 video stage container existing (can mount media into it).
- Phase 3 depends on Phase 2 (overlays need playing/paused state from loaded media).
- Phase 4 depends on Phases 1–3 (list shell uses video stage + overlay pattern).
- Phase 5 depends on Phase 4 (auto-resize builds on list shell height measurement).
- Phase 6 depends on all prior phases.

## Phase transition checklist

Before moving to the next phase, confirm the prior phase **Acceptance criteria** are satisfied at
implementation level (code complete; tests written).

## Parallelization

Phases are **strictly sequential**. Do not parallelize across phase numbers.

Within Phase 6, unit tests and E2E spec authoring may proceed in one agent session but verification
commands are cumulative at the end.

## File order

- [`01-layout-tokens-and-responsive-single.md`](./01-layout-tokens-and-responsive-single.md)
- [`02-video-media-mount-and-playback.md`](./02-video-media-mount-and-playback.md)
- [`03-video-overlays-info-controls-chapter.md`](./03-video-overlays-info-controls-chapter.md)
- [`04-list-count-and-video-list-fixed.md`](./04-list-count-and-video-list-fixed.md)
- [`05-video-list-autoresize-advanced.md`](./05-video-list-autoresize-advanced.md)
- [`06-tests-e2e-and-docs.md`](./06-tests-e2e-and-docs.md)

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for execution prompts.
