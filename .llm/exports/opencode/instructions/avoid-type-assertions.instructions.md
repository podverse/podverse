---
description: "Avoid type assertions (as) when a better approach exists; prefer types, narrowing, type guards."
applyTo:
  - "**/*.ts"
  - "**/*.tsx"
---

# Avoid Type Assertions

It is **critical** to avoid `as` (type assertions) when there is a better way. Assertions bypass the type checker and can hide bugs.

## Prefer

- **Better types**: Add or extend DTOs/interfaces so values are correctly typed at the source.
- **Optional chaining**: Use `obj?.prop` when the type allows optional/unknown shape.
- **Type guards**: Use `function isFoo(x): x is Foo` to narrow with a single, documented assertion inside the guard.
- **Narrowing**: Use `in`, `typeof`, and discriminated unions so TypeScript narrows for you.

## Allowed exceptions

- **Import aliases**: `import { foo as bar } from '...'` (not a type assertion).
- **Const assertions**: `as const` for literal types (e.g. tuple, readonly object).
- **Rare escape hatches**: When there is genuinely no better option, use one assertion and add a short comment explaining why.

## Examples

- BAD: `(data as { title?: string }).title` in call sites — type the DTO or use a type guard.
- GOOD: Type the payload (e.g. `AddByRSSResourceData`) and use `data?.title` or a guard that narrows once.
