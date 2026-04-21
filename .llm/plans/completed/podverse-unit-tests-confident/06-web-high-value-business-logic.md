# Phase 06 - Web High-Value Business Logic

## Targets

- `apps/web/src/utils/localSettings/uiTheme.ts`
- `apps/web/src/utils/cookie.ts`
- Additional non-UI-heavy utilities/hooks if they provide high signal.

## Test Intent

- Add focused unit tests for web behavior contracts without broad component testing.

## Planned Test Areas

1. **Theme utility logic**
   - Known theme values.
   - Fallback behavior for invalid values.

2. **Cookie utility logic**
   - Parsing and serialization expectations.
   - Robustness around absent and malformed cookie input.

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/web
```
