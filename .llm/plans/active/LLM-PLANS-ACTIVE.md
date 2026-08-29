# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, remove the set after operator confirmation; do not retain completed plan archives.
- See [LLM.md](/.llm/LLM.md).

## Indexed sets

_Active (mobile):_ The mobile master plan is split into **phases** — see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md). **Phase 1** (agent-led framework
build-out) is **closed**: 376 steps done, with durable outcomes retained in the Phase 1 master plan.
**Phase 2** is **active** and
**operator-guided** — the operator pastes legacy-app screenshots per screen area and the agent asks
questions before planning (**mobile-legacy-screenshot-planning** skill). Phase 2 plan sets live at
`.llm/plans/active/mobile-p2-<area>/` and absorb the old Track 23 visual polish. Carried forward:
**Phase 3** V4V (19.6), **Phase 4** watch + TV (18.6–18.14), **Phase 5** native store IAP
(19.2/19.3/19.5). Operational leftovers and three open operator-decision items (CarPlay Simulator
proof, Android Auto DHU + Play Console declaration, `deep-link`/`push` E2E harness) are tracked in
[Phase 2 § Track P2.3](/docs/proposals/mobile/_master-plan_/phase-2/001-MASTER-PLAN-PHASE-2.md).
**Publish hold:** no alpha/internal test-track publish until the operator signs off on visual polish.

_Active (non-mobile):_ `media-player-livestream-hls-migration/` (blocked on the media-player
architecture refactor; `video.js` + the `Controller/LiveStream/` tree are still present),
`web-404-hardening-deferred/` (deferred; no `isApiRequestNotFoundError` helper or SEO-fetcher
404→`notFound()` wrapper exists yet), `web-e2e-coverage-high-level/` (planning-only baseline).

Completed plan files have been removed per operator request. Durable implementation status remains in
the phase master plans and feature documentation.
