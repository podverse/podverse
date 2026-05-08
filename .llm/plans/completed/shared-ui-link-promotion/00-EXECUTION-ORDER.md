# Execution Order

Execute the numbered prompts in this order:

1. `01-shared-ui-link.md` — add the framework-agnostic `Link` primitive in
   `@podverse/ui` (no callsite changes yet).
2. `02-web-migration.md` — replace `apps/web` `Link.tsx` with a thin wrapper
   that injects `next/link` and `getSafeLinkHref`; delete the now-unused web
   SCSS module; update the ADR exclusion note.
3. `03-verification-and-followups.md` — lint, type-check, `@podverse/ui` unit
   tests, build packages, and run scoped web E2E.

## Dependencies

- `01` introduces the new shared primitive and unit tests. `02` depends on it.
- `02` is the only callsite-touching step (in practice it touches just the
  app wrapper, since the import path stays the same).
- `03` runs last. Defer all verification commands to this step, per
  [.cursorrules](../../../../.cursorrules) (do not run tests during plan
  implementation).

## Completion Tracking

Mark each completed item in `COPY-PASTA.md`. When the whole set is complete,
move this directory from `.llm/plans/active/shared-ui-link-promotion/` to
`.llm/plans/completed/shared-ui-link-promotion/` per
[plan-completion](../../../../.cursor/skills/plan-completion/SKILL.md).

**Status:** This set is archived under **`.llm/plans/completed/shared-ui-link-promotion/`**
(all prompts finished).
