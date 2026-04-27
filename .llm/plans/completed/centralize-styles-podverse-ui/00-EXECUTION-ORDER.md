# Execution order

## Sequencing rule

Phases run **sequentially**. Do not begin a later phase until prior-phase verification has completed. Within Phase 3b, Groups A/B/C run in **parallel**.

## Phase 1 — Foundation (sequential, single agent)

Plan: `01-package-tokens-and-exports.md`

Build the canonical token, theme, mixin, and font-face layer in `@podverse/ui` and update the four package SCSS modules that consume the old `_variables.scss`.

Gate before next phase:

- `npm run -w @podverse/ui type-check`
- `npm run -w @podverse/ui lint`
- The package SCSS imports compile cleanly when consumed by both apps' Sass loaders (verified by Phase 2 build).

## Phase 2 — Web swap-over (sequential, single agent)

Plan: `02-web-migrate-to-package.md`

Replace `apps/web/src/styles/{variables,ui-themes,mixins,font-faces}` with thin forwarders to `@podverse/ui/styles/*` (or remove them and consume from `apps/web/src/styles/index.scss` directly), preserving byte-equivalent output.

Gate before next phase:

- `npm run -w @podverse/web build` succeeds.
- Manual visual check (or screenshot smoke) on `/`, `/podcasts`, and at least one playlist page shows no diff vs `main`.
- `make app_web_e2e_run_basic_smoke` passes.

## Phase 3 — Management-web migration

### Phase 3a (sequential, single agent)

Plan: `03-management-globals-and-themes.md`

Wire management-web's globals to the package, add the `[data-ui-theme]` wrapper to root layout, install Roboto fonts, add a theme switcher to chrome.

Gate before Phase 3b:

- `npm run -w @podverse/management-web build` succeeds.
- Management-web boots in dark theme by default; switcher cycles `dark` → `light` → `dracula` and persists across reload.
- Tokens resolve (no broken `var(...)` references in DevTools).

### Phase 3b (parallel — 3 agents simultaneously)

Plans run independently — they each touch their own SCSS modules and never the same file:

- Agent 3B-A: `04-management-modules-group-a-pages.md`
- Agent 3B-B: `05-management-modules-group-b-chrome.md`
- Agent 3B-C: `06-management-modules-group-c-ui.md`

Gate before next phase:

- All three agents complete.
- `npm run -w @podverse/management-web type-check`
- `npm run -w @podverse/management-web build`
- `rg "@use '\.\./.*styles/theme/variables' as theme" apps/management-web` returns no matches.
- `make app_management_web_e2e_run_basic_smoke` passes.

## Phase 4 — Cleanup (single agent)

Plan: `07-cleanup-and-skill.md`

Delete the legacy `apps/management-web/src/styles/theme/` directory, remove (or keep as forwarders) the old `apps/web/src/styles/{variables,ui-themes,font-faces,mixins}` files, add the `styles-source-of-truth` skill, and update `packages/ui/README.md`.

Gate to mark plan set complete:

- `rg "styles/theme/variables"` returns no matches anywhere in the repo.
- Both apps still build cleanly.
- New skill present at `apps/management-web/.cursor/skills/styles-source-of-truth/` (or repo-level location, see plan 07).
- Plan set moved to `.llm/plans/completed/centralize-styles-podverse-ui/`.
