# 01 — Helpers `./dto` export + mobile imports

## Scope

Add `@podverse/helpers/dto` and switch mobile DTOAccount imports; remove AuthProvider TODO.

## Steps

1. In [`packages/helpers/package.json`](../../../../packages/helpers/package.json) `exports`, add:

```json
"./dto": {
  "types": "./dist/dtos/index.d.ts",
  "default": "./dist/dtos/index.js"
}
```

(same pattern as `./locales` / `./timeFormatter`).

2. Update imports:

- [`apps/mobile/src/auth/AuthProvider.tsx`](../../../../apps/mobile/src/auth/AuthProvider.tsx) —
  remove the `TODO(mobile-auth-nav-tech-debt/03)` comment; use
  `import type { DTOAccount } from '@podverse/helpers/dto'`
- [`apps/mobile/src/screens/auth/LoginScreen.tsx`](../../../../apps/mobile/src/screens/auth/LoginScreen.tsx) —
  same subpath

3. Docs: in [`apps/mobile/APPS-MOBILE.md`](../../../../apps/mobile/APPS-MOBILE.md) § Metro /
   helpers barrel note, mention `@podverse/helpers/dto` for DTOs alongside locales /
   timeFormatter.

4. Do **not** invent a new DTO package or deep-import into `src/`.

## Acceptance criteria

- `@podverse/helpers/dto` resolves after `npm run build -w packages/helpers`
- No `DTOAccount` imports from `@podverse/helpers` barrel in mobile
- No leftover TODO about DTO subpath in AuthProvider

## Verification (operator)

```bash
npm run build -w packages/helpers
npm run mobile:e2e:test -- auth-login
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
