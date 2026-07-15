# 03 — Mobile entry and import hygiene

## Scope

Small hygiene items called out in the pre-commit review that reduce future Metro / RN Navigation
friction.

## Changes

### 1. Gesture handler entry import

React Navigation expects `react-native-gesture-handler` imported at the entry root.

File: [apps/mobile/index.js](/apps/mobile/index.js)

Add as the **first** import:

```js
import 'react-native-gesture-handler';
```

(Package already in `apps/mobile/package.json`.)

### 2. Prefer non-barrel type import for `DTOAccount`

File: [apps/mobile/src/auth/AuthProvider.tsx](/apps/mobile/src/auth/AuthProvider.tsx)

Today: `import type { DTOAccount } from '@podverse/helpers'` (type-only — safe at runtime).

Prefer a path that does not depend on the helpers barrel (which re-exports Node `crypto` via
`hash`) if a subpath or deep type export already exists / is cheap to add:

- Best: add `@podverse/helpers/dto` (or similar) subpath export for DTOs if missing, **or**
- Use a documented existing subpath if one already exports `DTOAccount`
- Avoid inventing a large DTO package split in this plan — if no clean subpath exists without a
  new export, keep type-only barrel import and leave a one-line TODO comment pointing here

Do **not** introduce a value import from `@podverse/helpers` barrel on mobile.

### 3. Optional: SafeAreaProvider

Only if React Navigation docs / warnings require it for this Expo 52 + RN 0.76 stack and it is not
already provided. Do not add wrappers “just in case” if tabs already work in E2E.

## Do not

- Run `expo prebuild` unless the gesture import alone forces a native rebuild (it should not)
- Run tests during agent work

## Verification (operator)

**Mobile Maestro** (nav still works after entry import):

```bash
npm run mobile:e2e:test -- tab-switch-playback
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
