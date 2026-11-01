# AI guide — `apps/management-web`

Monorepo-wide rules: [`AGENTS.md`](/AGENTS.md) (repository root).

- **Styles / design tokens:** [`styles-source-of-truth`](/.cursor/skills/styles-source-of-truth/SKILL.md) — canonical tokens live in `@podverse/ui`; import from `packages/ui/src/styles/...` when the Sass pipeline does not resolve the package spec.
- **Reusable UI first:** for generic forms/tables/badges/alerts/loading states, prefer `@podverse/ui` over page-specific components and duplicated `page.module.scss` patterns.
- **Modal footers:** [`modal-layout-contract`](/.cursor/skills/modal-layout-contract/SKILL.md) — use **`Modal.Actions`** inside **`Modal`** (right-aligned, wrapping); **`ConfirmPanelActions`** was removed from **`@podverse/ui`**.
- **After save on New/Edit:** [`management-post-save-navigation`](/.cursor/skills/management-post-save-navigation/SKILL.md) — redirect to the resource list when create or primary edit succeeds (exceptions for invite links and password-only tab).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
