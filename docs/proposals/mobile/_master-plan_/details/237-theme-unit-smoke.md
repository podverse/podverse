# 237-theme-unit-smoke

**Master step:** 7.16
**Model (author + implement):** Auto
**Status:** done

## Scope

- Add Vitest tests under `apps/mobile` (or `@podverse/design-tokens`) asserting each theme in
  `ALL_POSSIBLE_THEMES` resolves required token keys (background, text primary, etc.).
- Fail if any theme map is missing a required key.

## Acceptance criteria

- Test file runs with `npm run test -w apps/mobile` (or design-tokens workspace)
- All six themes covered
- Test documents required token key list

## Web parity references

- [`packages/ui/src/lib/uiTheme/uiTheme.ts`](/packages/ui/src/lib/uiTheme/uiTheme.ts)

## Verification

```bash
npm run test -w @podverse/design-tokens
npm run test -w apps/mobile
```
