# 06 — Rules and skills hardening

## Prompt (Agent)

Execute **phase 06**: strengthen editor guidance so new UI defaults to `packages/ui` and
promotion from apps is routine. Follow [`llm-cursor-source`](../../../../.cursor/skills/llm-cursor-source/SKILL.md)
— edit only `.cursor/**`, `.cursorrules`, skills; do not hand-edit `.llm/exports/`.

## Rule updates (concrete)

### [`prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)

Add a short **promotion checklist** when touching `apps/web` or `apps/management-web`:

1. Search `packages/ui` for existing primitive.
2. If generic and reusable → add to `packages/ui` (not a second app-local copy).
3. Allowed to stay in app only when hitting **denylist**: Next.js imports, `next-intl`,
   authenticated data fetch in render, product-only routes, domain modals.

### [`management-web-prefer-shared-ui.mdc`](../../../../.cursor/rules/management-web-prefer-shared-ui.mdc)

- Add bullet: before adding a component under `apps/management-web/src/components`, compare with
  **web** implementation; if same pattern, extend `@podverse/ui` instead.
- Reference phase 05 database pagination and `<select>` replacement examples.

### [`shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc)

- Optional: add one-line reminder that **new layout primitives** (Callout, CTA shell) follow the
  same no-copy rule.

## Skill updates

### [`reusable-components/SKILL.md`](../../../../.cursor/skills/reusable-components/SKILL.md)

Add **“Promotion rubric”** subsection:

| Question                                              | If yes →                         |
| ----------------------------------------------------- | -------------------------------- |
| Used in two apps or foreseeable second consumer?      | `packages/ui`                    |
| Only strings/router differ?                           | App wrapper around ui primitive  |
| Imports `next/*` or app config?                       | App wrapper                      |
| Duplicates ui component with small style tweak?     | Extend ui `variant` / `appearance`|

## New skill (recommended)

Create `.cursor/skills/ui-component-promotion/SKILL.md`:

- **When to use**: extracting or deduplicating components between web and management-web.
- **Steps**: inventory → prop API (no embedded copy) → SCSS in ui → export → app migration →
  unit tests → E2E if behavior visible.
- **Link**: `shared-ui-i18n`, `prefer-shared-ui-web-management`, `feature-implementation-testing`.

## [`AGENTS.md`](../../../../AGENTS.md)

- One paragraph pointer to the new skill under Shared UI section (if skill is added).

## Completion criteria

- Rules remain under ~100 lines each where practical (split if needed per `plan-creation`).

## Completed (2026-05-06)

- **`prefer-shared-ui-web-management.mdc`**: promotion checklist (search ui → extend ui → stay-in-app denylist).
- **`management-web-prefer-shared-ui.mdc`**: compare with web before new management components; phase 05 pagination / FormDropdown examples.
- **`shared-ui-i18n.mdc`**: layout primitives (Callout, CTA shell, Accordion) in review checklist.
- **`reusable-components`**: Promotion rubric table + pointer to **`ui-component-promotion`**.
- **New** `.cursor/skills/ui-component-promotion/SKILL.md`.
- **`AGENTS.md`**: Shared UI paragraph + skills list; **`.cursorrules`**: `ui-component-promotion` when extracting between apps.
