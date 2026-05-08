# AI guide — `apps/web`

Monorepo-wide rules: [`AGENTS.md`](../../AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](../../.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; this app may use one-line `@forward` shims under `src/styles/` to the package (do not duplicate values).
- **Shared UI components:** Prefer importing from `@podverse/ui` in feature files. When the **same** configured usage (including `next-intl` for `aria-label` / copy) appears **twice or more**, extract a thin app-local wrapper under `src/components/` that forwards props — see **`reusable-components`** (app-local configured wrappers). Avoid bare `export { X } from '@podverse/ui'` re-exports with no wiring.
