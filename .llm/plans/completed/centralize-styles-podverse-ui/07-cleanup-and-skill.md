# Phase 4 — Cleanup, skill, docs

## Scope

Delete legacy files, optionally remove forwarder shims in `apps/web`, add a skill that codifies "tokens live in `@podverse/ui`", and update `packages/ui/README.md`.

## Prerequisites

- Phases 1–3 complete; both apps build; `make app_web_e2e_run_basic_smoke` and `make app_management_web_e2e_run_basic_smoke` pass.
- `rg "@use '\.\./.*styles/theme/variables' as theme" apps/management-web` returns zero matches.

## Steps

### 1. Delete `apps/management-web/src/styles/theme/`

```bash
rg "styles/theme/variables|styles/theme/_variables" apps/management-web
```

Confirm zero matches, then delete the directory:

```bash
rm -r apps/management-web/src/styles/theme
```

### 2. Decide on `apps/web` forwarders

Two options — the user's preference governs:

**Option A: keep forwarders (lower risk).**
Leave `apps/web/src/styles/{variables,ui-themes,font-faces,mixins}/*.scss` as one-line `@forward` files. Future contributors see the canonical name `@podverse/ui/styles/*` whenever they open these files. No further work in this phase.

**Option B: delete forwarders, rewrite consumers.**
Delete every per-file forwarder under `apps/web/src/styles/{variables,ui-themes,mixins}` and `apps/web/src/styles/font-faces.scss`. Then update every consumer that did deep imports:

```bash
# Show all deep imports that need rewrites.
rg "@use '\.\./.*(variables|ui-themes|mixins|font-faces)" apps/web/src
```

Replace each match with:

- `@use '@podverse/ui/styles/breakpoints' as *;` (when only breakpoint vars were needed)
- `@use '@podverse/ui/styles/variables' as *;` (when full token set was needed)
- `@use '@podverse/ui/styles/mixins' as *;`

This is a larger touch surface (tens of files) and adds risk. **Default: Option A.** Pursue Option B only if the user explicitly requests it.

### 3. Add the skill

Create `.cursor/skills/styles-source-of-truth/SKILL.md` (repo root):

```markdown
---
name: styles-source-of-truth
description: Design tokens, themes, mixins, and font-faces live in @podverse/ui. Apps must consume them via @use '@podverse/ui/styles/*'. Do not duplicate tokens in app SCSS.
---

# styles-source-of-truth

## Source of truth

`packages/ui/src/styles/` is the canonical home for:

- Design tokens (CSS custom properties + SCSS-mirror variables): `_variables.scss`, `_breakpoints.scss`
- Themes (dark/light/dracula on `[data-ui-theme]`): `_themes.scss`
- Shared SCSS mixins: `_mixins.scss`
- Roboto font-faces: `_font-faces.scss`

## Usage in apps

```scss
// In an app SCSS file
@use '@podverse/ui/styles/variables' as *;
@use '@podverse/ui/styles/mixins' as *;

.x {
  padding: var(--spacing-md);
  color: var(--text-color-primary);

  @include desktop {
    padding: var(--spacing-lg);
  }
}
```

## Rules

- Do NOT add new tokens to `apps/web/src/styles/...` or `apps/management-web/src/styles/...`. Add them in `packages/ui/src/styles/_variables.scss` (and `_themes.scss` if theme-dependent), and they become available to both apps automatically.
- Theme-dependent values (any color, any gradient, button states) MUST be defined in all three theme blocks (`dark` / `light` / `dracula`) in `packages/ui/src/styles/_themes.scss`.
- Non-theme values (spacing, font-size, border-radius, breakpoints, etc.) live in `:root` inside `_variables.scss`.
- The default theme (when no `data-ui-theme` is set) is `dark`. Both `:root` and `[data-ui-theme='dark']` declare the same dark palette in `_themes.scss`.
- `apps/web` is the source of truth for token VALUES. If you need to change a value used by both apps, change it in `packages/ui/src/styles/` and verify `make app_web_e2e_run_basic_smoke` still passes.

## When to break this skill

Never. Token duplication is the bug class this skill exists to prevent.
```

Mention the skill from `apps/management-web/AGENTS.md` and `apps/web/AGENTS.md` (one-line reference).

### 4. Update `packages/ui/README.md`

Add a "Styles" section that lists the SCSS sub-path exports:

```markdown
## Styles

`@podverse/ui` exports SCSS sub-paths consumed by `apps/web` and `apps/management-web`:

- `@podverse/ui/styles/variables` — design tokens (CSS custom properties + SCSS-mirror variables) and breakpoints
- `@podverse/ui/styles/breakpoints` — breakpoint SCSS variables only
- `@podverse/ui/styles/themes` — `dark` / `light` / `dracula` theme blocks
- `@podverse/ui/styles/mixins` — shared SCSS mixins (media queries, layout, form, headers, buttons, etc.)
- `@podverse/ui/styles/font-faces` — Roboto `@font-face` declarations + `body { font-family }`
- `@podverse/ui/styles` — full bundle (font-faces + variables + themes + mixins) for app `globals.scss`

See `.cursor/skills/styles-source-of-truth/SKILL.md`.
```

### 5. Move plans to completed

After all verification passes:

```bash
mkdir -p .llm/plans/completed/centralize-styles-podverse-ui
mv .llm/plans/active/centralize-styles-podverse-ui/* .llm/plans/completed/centralize-styles-podverse-ui/
rmdir .llm/plans/active/centralize-styles-podverse-ui
```

## Verification

```bash
# Canonical layer is the only token home.
rg "styles/theme/variables" apps/management-web    # → 0
rg "styles/theme/" apps/management-web              # → 0

# Both apps build.
npm run -w @podverse/web build
npm run -w @podverse/management-web build

# E2E smoke for both.
make app_web_e2e_run_basic_smoke
make app_management_web_e2e_run_basic_smoke

# Skill exists and is referenced.
test -f .cursor/skills/styles-source-of-truth/SKILL.md
rg "styles-source-of-truth" apps/web/AGENTS.md apps/management-web/AGENTS.md
```

## Definition of done

- `apps/management-web/src/styles/theme/` deleted.
- Decision recorded for Option A vs B (default A).
- `.cursor/skills/styles-source-of-truth/SKILL.md` exists.
- `packages/ui/README.md` documents the SCSS exports.
- Plan set moved to `.llm/plans/completed/`.
- Both apps build and pass E2E smoke.
