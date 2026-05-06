# AI guide — `apps/web`

Monorepo-wide rules: [`AGENTS.md`](../../AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](../../.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; this app may use one-line `@forward` shims under `src/styles/` to the package (do not duplicate values).
- **Shared UI components:** Import from `@podverse/ui` in feature files; do not add local one-line re-export wrappers under `src/components/`.
