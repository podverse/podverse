# helpers-package-json-exports

## Started

2026-05-05

## Author

Agent

## Context

Align `@podverse/helpers` package.json with sibling packages by dropping redundant `exports`
(now covered by `main`, `types`, and `type: module`).

### Session 1 - 2026-05-05

#### Prompt (Developer)

Is `exports` needed in `@podverse/helpers/package.json`?

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed the `exports` map from `packages/helpers/package.json`; entry resolution remains via
  `main` and `types`, consistent with packages like `@podverse/orm` and `@podverse/helpers-backend`.

#### Files Modified

- packages/helpers/package.json
- .llm/history/active/helpers-package-json-exports/helpers-package-json-exports-part-01.md
