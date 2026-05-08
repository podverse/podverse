# 04 — Callsite migration and cleanup

## Goal

Remove redundant app-local UI where replaced by shared primitives.

## Prompt

- Confirm web `Media/Header/IconButton` callers need no import path changes (or update paths if file removed).
- Remove unused `IconButton.module.scss` under web media header if fully superseded.
- Grep for stale `useDropdownKeyboardNavigation` paths.
- Retain app-local dropdown **presentation** components if still web-specific.

## Done when

- No dead SCSS or duplicate hook; imports resolve cleanly.
