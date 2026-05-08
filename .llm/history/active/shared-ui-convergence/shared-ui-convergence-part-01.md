# shared-ui-convergence

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Shared UI convergence plan implementation (plan set completed under `.llm/plans/completed/shared-ui-convergence/`).

### Session 1 - 2026-05-06

#### Prompt (Developer)

Shared UI Convergence Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added cross-app Cursor rule `prefer-shared-ui-web-management.mdc` and frontmatter on `management-web-prefer-shared-ui.mdc`; reinforced `.cursorrules`, `AGENTS.md`, and `reusable-components` skill with web-first style baseline when converging overlap.
- Extended `@podverse/ui` `IconButton` with `appearance` (`control` | `ghost`), `accent` (`gold`), forwarding props for app `LinkComponent`, and safer `DefaultLink` implementation.
- Web media header `IconButton` is now a thin client wrapper around shared `IconButton` with `appearance="ghost"` and app `Link`; removed redundant header `IconButton.module.scss`.
- Promoted `useDropdownKeyboardNavigation` to `packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`; removed duplicate from `apps/web`; fixed click-outside target check without `as Node`; removed dead conditional that violated Rules of Hooks in the old file.
- Management-web storage row “view” action uses `ManagementIconButtonLink` adapter so `next/link` stays type-safe without widening `@podverse/ui` `LinkComponent` types to Next’s `LinkProps`.
- Plan set moved to `.llm/plans/completed/shared-ui-convergence/` after completion.
- Targeted management-web E2E not executed in this agent session (user should run the make command below after `make test_deps` / seed as usual).

#### Files Created/Modified

- `.llm/plans/completed/shared-ui-convergence/` (00-EXECUTION-ORDER, COPY-PASTA, 01–05)
- `.cursor/rules/prefer-shared-ui-web-management.mdc`
- `.cursor/rules/management-web-prefer-shared-ui.mdc`
- `.cursor/skills/reusable-components/SKILL.md`
- `.cursorrules`
- `AGENTS.md`
- `packages/ui/src/components/button/IconButton/IconButton.tsx`
- `packages/ui/src/components/button/IconButton/IconButton.module.scss`
- `packages/ui/src/components/button/IconButton/IconButton.test.tsx`
- `packages/ui/src/components/button/IconButton/index.ts`
- `packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`
- `packages/ui/src/index.ts`
- `apps/web/src/components/Media/Header/IconButton.tsx`
- `apps/web/src/components/Dropdown/Dropdown.tsx`
- `apps/web/src/components/ViewSelector/ViewSelector.tsx`
- `apps/web/src/components/MoreButton/MoreButton.tsx`
- `apps/web/src/components/NavBar/NavBarDropdownButton.tsx`
- `apps/web/src/components/Form/FormDropdown.tsx`
- `apps/web/src/components/MediaPlayer/Buttons/SettingsButton.tsx`
- `apps/management-web/src/lib/ManagementIconButtonLink.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- Removed: `apps/web/src/hooks/useDropdownKeyboardNavigation.tsx`, `apps/web/src/styles/components/Media/Header/IconButton.module.scss`
