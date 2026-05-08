# Shared UI component consolidation — summary

**Status:** Completed (2026-05-06). All numbered prompts and index files are in this directory
(see [`COPY-PASTA.md`](./COPY-PASTA.md)).

## Objective

Extract reusable UI from `apps/web` into `packages/ui` so web, management-web, and future apps
share one implementation. Keep **app wrappers** for `next-intl`, `next/link`, routing, auth,
runtime config, and domain flows. **Web visual baseline** wins when web and management-web
conflict unless a11y or product docs say otherwise.

## Scope (named families)

| Family            | Direction (typical)                                      |
| ----------------- | -------------------------------------------------------- |
| Accordion         | New shared primitive; web thin wrapper                   |
| App               | Stay app shell; optional dumb layout only if needed     |
| Callout           | New shared layout primitive                              |
| Call to action    | New shared layout shell; copy/routes in app              |
| Dropdown          | Extend/reconcile with `@podverse/ui` `DropdownMenu`     |
| Footer            | Mostly app; optional slot-only primitive                 |
| Form              | Field-by-field: use existing `@podverse/ui` form stack   |
| Image             | Stay web (Next/image + proxy/helpers)                    |
| Link              | Stay web (Next + safe href); optional render-prop API   |
| Loading / overlay | Shared `InlineSpinner` + new overlay shell if needed     |
| Modal             | Shared **shell** only; domain modals stay in apps        |
| More button       | Shared action menu wrapper                                |
| Nav arrow button  | Shared `IconButton` pattern + localized `aria-label`     |
| Navbar            | Converge web onto `@podverse/ui` `NavBar` slots over time|
| Pagination        | Unify API/UX with web baseline before broad replacement  |
| PopoverIcon       | New shared feedback primitive                            |
| Toast             | App wiring (`react-hot-toast`); not a `packages/ui` dep   |
| VirtualizedList   | Thin shared wrapper over virtuoso (peer if required)    |

## Existing guardrails

- [`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [`.cursor/rules/management-web-prefer-shared-ui.mdc`](../../../../.cursor/rules/management-web-prefer-shared-ui.mdc)
- [`.cursor/rules/shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [`.cursor/skills/reusable-components/SKILL.md`](../../../../.cursor/skills/reusable-components/SKILL.md)
- [`.cursor/skills/ui-component-promotion/SKILL.md`](../../../../.cursor/skills/ui-component-promotion/SKILL.md)

Phase `06` extends these so “promote to `packages/ui`” is the default reflex.

## Out of scope for this plan set

- Implementing migrations in code (this directory is the **plan**; execution is follow-on work).
- Editing the Cursor-generated plan file under `~/.cursor/plans/`.
