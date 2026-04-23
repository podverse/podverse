# Wave 2 — Web Hooks / Business Logic Utilities

## Targets

- [apps/web/src/utils/](apps/web/src/utils/)
- Selected hooks under [apps/web/src/hooks/](apps/web/src/hooks/) that are mostly pure.

## Intent

Extend Wave 1 (`cookie`, `uiTheme`) with **3–5 additional** focused tests for:

- Rate/proxy helpers ([apps/web/src/utils/proxy/rateLimiter.ts](apps/web/src/utils/proxy/rateLimiter.ts)) if testable without full Next runtime.
- Locale detection edge cases ([useLocaleDetect](apps/web/src/hooks/useLocaleDetect.ts)) — only if extractable pure logic.

## Guardrails

- No broad page or snapshot tests.
- Prefer extracted pure functions over mocking React runtime.

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/web
```
