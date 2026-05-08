# Shared UI Dropdown — packages/ui

Started: 2026-05-06  
Author: Agent  
Context: Promote web list/filter `Dropdown` into `@podverse/ui` for web + management-web consistency.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Shared `Dropdown` in `@podverse/ui`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all to-dos.

#### Key Decisions

- Implemented `Dropdown` and `DropdownOption` (typed menu rows with `label`, `param`, `value`) in `packages/ui`; avoided exporting the option type as `DropdownMenuItem` to prevent naming collision with `DropdownMenu` subcomponents.
- Lifted web styles as `Dropdown.module.scss` (`position: relative` wrapper only).
- Removed `apps/web/src/components/Dropdown` and app SCSS; all consumers import from `@podverse/ui`.

#### Files Created/Modified

- packages/ui/src/components/navigation/Dropdown/Dropdown.tsx
- packages/ui/src/components/navigation/Dropdown/Dropdown.module.scss
- packages/ui/src/components/navigation/Dropdown/Dropdown.test.tsx
- packages/ui/src/index.ts
- apps/web: migrated imports across headers, add-by-rss clients, dropdown configs; deleted local Dropdown component and styles.
