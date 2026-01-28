# Fix Web App Lint Warnings

## Overview

Fix 74 ESLint warnings in `apps/web` identified during the build:

- **12** `@typescript-eslint/no-non-null-assertion` warnings
- **61** `@typescript-eslint/no-explicit-any` warnings
- **1** `no-console` warning

## Plan Structure

| Phase | File                             | Warnings | Description                                         |
| ----- | -------------------------------- | -------- | --------------------------------------------------- |
| 0     | `00-overview.md`                 | -        | This overview                                       |
| 1     | `01-non-null-assertions.md`      | 12       | Fix `!` assertions in 4 files                       |
| 2     | `02-explicit-any-app.md`         | 7        | Fix `any` in app/ directory files                   |
| 3     | `03-explicit-any-components.md`  | 24       | Fix `any` in components/ files                      |
| 4     | `04-explicit-any-hooks-utils.md` | 30       | Fix `any` in hooks/, utils/, constants/, providers/ |
| 5     | `05-console-statement.md`        | 1        | Fix console.log in notifications                    |

## Approach

### For non-null assertions

- Use optional chaining (`?.`) where possible
- Add proper null checks with early returns
- Use type guards where appropriate

### For explicit any

- Determine the actual type from usage context
- Import proper types from `@podverse/helpers` or define locally
- Use `unknown` with type guards when type is truly dynamic

### For console statement

- Change `console.log` to `console.warn` or `console.error` (allowed by config)
