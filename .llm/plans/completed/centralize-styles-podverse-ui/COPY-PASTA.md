# COPY-PASTA — centralize-styles-podverse-ui

Use these prompts in sequence to execute this plan set. **Phases run sequentially.** Within Phase 3b, the three Group prompts run in **parallel** (3 agents at the same time).

Run all commands from the monorepo root: `/Users/mitcheldowney/repos/pv/podverse`.

## Execution rules

- Phase 1 → WAIT → Phase 2 → WAIT → Phase 3a → WAIT → Phase 3b (3 parallel agents) → WAIT → Phase 4
- Do NOT start a later phase until prior-phase verification passes.
- Do NOT run more than one Phase 3b group at the same time as Phase 1, 2, 3a, or 4.

---

## Phase 1 (1 agent)

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/01-package-tokens-and-exports.md

Build the canonical token, theme, mixin, and font-face layer in @podverse/ui.
- Add SCSS sub-path exports to packages/ui/package.json.
- Create packages/ui/src/styles/{_breakpoints,_variables,_themes,_mixins,_font-faces,index}.scss and the mixins/_*.scss partials.
- Do NOT rename any CSS custom property — apps/web is the source of truth.
- Replace `darken($color-primary, 8%)` in Pagination.module.scss with `var(--button-primary-bg-hover)`.

Verify:
  npm run -w @podverse/ui type-check && npm run -w @podverse/ui lint
```

---

## Phase 2 (1 agent — only after Phase 1 verification passes)

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/02-web-migrate-to-package.md

Switch apps/web to consume @podverse/ui/styles/* via thin @forward shims.
- Aggregator files (variables/index, ui-themes/index, mixins/index, font-faces) and per-file partials all become one-line `@forward '@podverse/ui/styles/...'`.
- Do NOT modify apps/web/src/styles/index.scss.
- Output must be byte-equivalent. Run a manual visual check on /, /podcasts, /playlist/<id>.

Verify:
  npm run -w @podverse/web build
  make app_web_e2e_run_basic_smoke
```

---

## Phase 3a (1 agent — only after Phase 2 verification passes)

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/03-management-globals-and-themes.md

Wire apps/management-web globals to @podverse/ui/styles/*, copy Roboto fonts to apps/management-web/public/fonts/Roboto/, add the data-ui-theme wrapper on <html> seeded from a cookie, and add ManagementThemeSwitcher to the user menu chrome.
- Default theme: dark.
- Cookie name: mgmt_ui_theme.
- Do NOT migrate the 24 *.module.scss files yet — Phase 3b handles those.

Verify:
  npm run -w @podverse/management-web build
  Boot dev server, confirm dark theme renders, switcher cycles dark→light→dracula and persists across reload.
```

---

## Phase 3b (3 agents in PARALLEL — only after Phase 3a verification passes)

### Agent 3B-A — Group A: admin/data pages

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/04-management-modules-group-a-pages.md

Migrate 10 SCSS modules under apps/management-web/src/app/(management)/{dashboard,stats,workers,database,feed-operations,users}/ from `theme.$x` to `@podverse/ui/styles/variables`.

Apply the canonical token map. Do not introduce Sass color functions on var(--…).

Verify:
  npm run -w @podverse/management-web type-check
  npm run -w @podverse/management-web build
```

### Agent 3B-B — Group B: admins + chrome

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/05-management-modules-group-b-chrome.md

Migrate 6 SCSS modules: admins/{page, new, [id]/edit}, app/page.module.scss, ManagementAppLayout, ManagementUserMenu.

Apply the canonical token map from 04-management-modules-group-a-pages.md (identical for all groups).

Verify:
  npm run -w @podverse/management-web type-check
  npm run -w @podverse/management-web build
```

### Agent 3B-C — Group C: UI components

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/06-management-modules-group-c-ui.md

Migrate 8 SCSS modules: components/ui/{Alert, Button, Card, CenterContainer, Form/{FormGroup, FormInput, FormLabel}, LoadingText}.

Apply the canonical token map. Use --background-color-error / --border-color-error / --shadow-card / --transition-default (added to all three themes in Phase 1).

Verify:
  npm run -w @podverse/management-web type-check
  npm run -w @podverse/management-web build
```

### Phase 3b combined gate (after all three agents finish)

```bash
rg "@use '\.\./.*styles/theme/variables' as theme" apps/management-web   # expect 0
npm run -w @podverse/management-web build
make app_management_web_e2e_run_basic_smoke
```

---

## Phase 4 (1 agent — only after Phase 3b combined gate passes)

```text
Implement the plan in .llm/plans/active/centralize-styles-podverse-ui/07-cleanup-and-skill.md

Delete apps/management-web/src/styles/theme/, add .cursor/skills/styles-source-of-truth/SKILL.md, update packages/ui/README.md, and reference the skill from both apps' AGENTS.md.

Default for apps/web: keep forwarder shims (Option A) — do NOT rewrite consumers unless explicitly requested.

After verification, move the plan set from .llm/plans/active/ to .llm/plans/completed/.

Verify:
  rg "styles/theme/variables" apps/management-web   # expect 0
  npm run -w @podverse/web build
  npm run -w @podverse/management-web build
  make app_web_e2e_run_basic_smoke
  make app_management_web_e2e_run_basic_smoke
```
