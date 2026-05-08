# Phase 03 — Governance (Podverse + Metaboost)

## Scope

Encode the no-fallback policy for CSS custom properties so future edits do not reintroduce
`var(--token, fallback)`.

## Podverse repo

1. Add `.cursor/rules/css-custom-properties-no-var-fallbacks.mdc`:
   - Explain: no second argument to `var()` in SCSS/CSS (including nested `var(--a, var(--b))` as a
     fallback for `--a`).
   - Point to canonical tokens in `packages/ui/src/styles/` (`_variables-root.scss`, `_themes.scss`).
   - Glob: `**/*.{scss,css}` or always-on per team preference.

2. Update `.cursor/skills/styles-source-of-truth/SKILL.md` with a short bullet linking to that rule.

## Metaboost repo

1. Add `.cursor/rules/css-custom-properties-no-var-fallbacks.mdc` (same policy; point to
   `packages/ui/src/styles/_themes.scss` and env/token conventions used there).

2. Update `.cursor/skills/global/SKILL.md` or `.cursor/skills/reusable-components/SKILL.md` with a pointer
   to the rule when editing module SCSS.

## Verification

- Rules appear in Cursor for `*.scss` edits.
- No duplicate conflicting guidance in `.cursorrules`; keep a single sentence cross-reference if needed.
