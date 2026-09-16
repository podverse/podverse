# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, move the set to `.llm/plans/completed/` and update this index.
- See [LLM.md](/.llm/LLM.md).

## Indexed sets

_Active (mobile):_ no active mobile plan sets right now. The completed player area archive is
`.llm/plans/completed/mobile-p2-player/` (P2.1.4 details 747–750 implemented; 751 deferred). The
mobile master plan is split into **phases** — see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md). **Phase 1** is **closed**. **Phase 2**
is **active** (operator-guided) with follow-up areas still in progress. Carried forward: **Phase 3**
V4V, **Phase 4** watch + TV, **Phase 5** native store IAP. Operational leftovers and three open
operator-decision items (CarPlay Simulator proof, Android Auto DHU + Play Console declaration,
`deep-link`/`push` E2E harness) are tracked in
[Phase 2 § Track P2.3](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).
**Publish hold:** no alpha/internal test-track publish until the operator signs off on visual polish.

_Active (non-mobile):_ `media-player-livestream-hls-migration/` (blocked on the media-player
architecture refactor; `video.js` + the `Controller/LiveStream/` tree are still present),
`web-404-hardening-deferred/` (deferred; no `isApiRequestNotFoundError` helper or SEO-fetcher
404→`notFound()` wrapper exists yet), `web-e2e-coverage-high-level/` (planning-only baseline).

Completed plan archives live under `.llm/plans/completed/`. Durable implementation status also lives
in the phase master plans and feature documentation.
