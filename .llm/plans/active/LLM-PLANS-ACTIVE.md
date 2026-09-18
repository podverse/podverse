# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, move the set to `.llm/plans/completed/` and update this index.
- See [LLM.md](/.llm/LLM.md).

**Set vs set run order:** [COPY-PASTA-RUN-ORDER.md](COPY-PASTA-RUN-ORDER.md).

## Indexed sets

_Active (mobile), git-sort / run order:_

- _None currently._

Completed Make Clip + FAQ set: 752–756 landed and the active plan set was removed.

Completed music detail archive: `.llm/plans/completed/04-mobile-p2-music-detail/` (762–764).

P2.1.5 queue (757–759) is complete and removed from active planning. Completed player archive:
`.llm/plans/completed/mobile-p2-player/` (747–750; 751 deferred). Phase index:
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md). **Phase 1** closed; **Phase 2** active.
Carried forward: Phase 3 V4V, Phase 4 watch + TV, Phase 5 IAP. Open operator items (CarPlay,
Android Auto, deep-link E2E) in
[Phase 2 § Track P2.3](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).
**Publish hold:** no alpha/internal test-track publish until visual polish sign-off.

_Active (non-mobile):_ `media-player-livestream-hls-migration/` (blocked on media-player
architecture refactor), `web-404-hardening-deferred/`, `web-e2e-coverage-high-level/`
(planning-only baseline).

Completed plan archives live under `.llm/plans/completed/`. Durable implementation status also lives
in the phase master plans and feature documentation.
