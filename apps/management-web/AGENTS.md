# AI guide — `apps/management-web`

Monorepo-wide rules: [`AGENTS.md`](/AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](/.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; import from `packages/ui/src/styles/...` when the Sass pipeline does not resolve the package spec.
- **Reusable UI first:** for generic forms/tables/badges/alerts/loading states, prefer `@podverse/ui` over page-specific components and duplicated `page.module.scss` patterns.
- **Modal footers:** [`modal-layout-contract`](/.cursor/skills/modal-layout-contract/SKILL.md) — use **`Modal.Actions`** inside **`Modal`** (right-aligned, wrapping); **`ConfirmPanelActions`** was removed from **`@podverse/ui`**.
- **After save on New/Edit:** [`management-post-save-navigation`](/.cursor/skills/management-post-save-navigation/SKILL.md) — redirect to the resource list when create or primary edit succeeds (exceptions for invite links and password-only tab).
