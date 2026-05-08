# Shared UI component consolidation — copy-pasta checklist

- [x] `01-inventory-and-target-apis.md`
- [x] `02-low-risk-extractions.md`
- [x] `03-medium-risk-convergence.md`
- [x] `04-high-risk-feasibility-and-wrappers.md`
- [x] `05-management-web-convergence.md`
- [x] `06-rules-and-skills-hardening.md`
- [x] `07-verification-and-rollout.md`

Paste each file’s **Prompt** block into a session when executing manually; an agent may complete
phases in one branch—still update this checklist and move completed files per plan lifecycle.

## Prompt blocks (verbatim)

### 01

Execute **Shared UI component consolidation — phase 01**: finalize per-component inventory,
migration contract (shared primitive vs app wrapper), and target paths under `packages/ui`.
Do not change product behavior in this phase beyond documentation if needed.

### 02

Execute **phase 02**: add or extend `@podverse/ui` primitives for Accordion, Callout, CTA message
shell, PopoverIcon, VirtualizedList, and loading overlay foundation. Wire `apps/web` through thin
wrappers only where Next or copy is required. Export new symbols from `packages/ui/src/index.ts`.

### 03

Execute **phase 03**: reconcile web implementations with existing `@podverse/ui` navigation and
button primitives. Prefer **web visual baseline** in shared SCSS (`appearance` / `variant`).

### 04

Execute **phase 04**: decide what **must** stay in apps vs what can move. Document decisions in
PR description; avoid half-migrations that break Next or security helpers.

### 05

Execute **phase 05**: after shared primitives exist or APIs align, update `apps/management-web` to
use them where it reduces drift from **web baseline**. Keep wrappers for session, i18n, and
Next-specific bridges.

### 06

Execute **phase 06**: strengthen editor guidance so new UI defaults to `packages/ui` and
promotion from apps is routine. Follow `llm-cursor-source` — edit only `.cursor/**`,
`.cursorrules`, skills; do not hand-edit `.llm/exports/`.

### 07

Execute **phase 07**: verify each merged migration from phases 02–05. Update `.llm/history/active/`
per `llm-history-tracking`. Move completed numbered plan files to
`.llm/plans/completed/shared-ui-component-consolidation/` when **all** phases done; keep
`COPY-PASTA.md` and `00-*` in `active/` until then (per plan lifecycle).
