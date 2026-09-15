# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, remove the set after operator confirmation; do not retain completed plan archives.
- See [LLM.md](/.llm/LLM.md).

## Indexed sets

_Active (mobile):_ none. Phase 2 **P2.1.2 podcast screen** is implemented (details 723–727); episode
detail waits on its own screenshot batch. The mobile master plan is split into **phases** — see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md). **Phase 1** is **closed**. **Phase 2**
is **active** (operator-guided, screenshot loop). Home (podcasts) + Search + foundations are
archived at `.llm/plans/completed/mobile-p2-home-podcasts/`. Carried forward: **Phase 3** V4V,
**Phase 4** watch + TV, **Phase 5** native store IAP. Operational leftovers and three open
operator-decision items (CarPlay Simulator proof, Android Auto DHU + Play Console declaration,
`deep-link`/`push` E2E harness) are tracked in
[Phase 2 § Track P2.3](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).
**Publish hold:** no alpha/internal test-track publish until the operator signs off on visual polish.

_Active (non-mobile):_ `media-player-livestream-hls-migration/` (blocked on the media-player
architecture refactor; `video.js` + the `Controller/LiveStream/` tree are still present),
`web-404-hardening-deferred/` (deferred; no `isApiRequestNotFoundError` helper or SEO-fetcher
404→`notFound()` wrapper exists yet), `web-e2e-coverage-high-level/` (planning-only baseline).

Completed plan files have been removed per operator request. Durable implementation status remains in
the phase master plans and feature documentation.
