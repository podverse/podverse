# Phase 01: Rename and align constants

**Repo:** Metaboost only (Podverse changes come in Phase 02+)

## Goal

Rename `AUTH_MODE` to `ACCOUNT_SIGNUP_MODE` across the entire Metaboost codebase. Update all references, types, validation, config, env files, docs, and tests to use the new name. Keep the same three values (`admin_only_username`, `admin_only_email`, `user_signup_email`).

## Why first

Podverse will adopt the same three values in Phase 02. Aligning the naming first ensures both repos share the same terminology before Podverse adds the new mode.

## Changes

### 1. Rename env var constant

**`packages/helpers/src/auth/auth-mode-constants.ts`**
- Rename `AUTH_MODE_ADMIN_ONLY_USERNAME` to `ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_USERNAME` (and same for the other two)
- Rename `AUTH_MODE_VALUES` to `ACCOUNT_SIGNUP_MODE_VALUES`
- Rename `AuthModeValue` type to `AccountSignupModeValue`
- Update `normalizedAuthMode()` and `isAuthModeValue()` names accordingly

### 2. Update capability type

**`packages/helpers/src/auth/auth-mode-capabilities.ts`**
- Update imports to use renamed constants
- Rename `AuthModeCapabilities` to `AccountSignupModeCapabilities` (or keep as-is if preferred for brevity -- discuss)
- Update `getSharedAuthModeCapabilities()` function name

### 3. Update all imports and usages

Files that reference `AUTH_MODE` env var or the old constant names (grep for `AUTH_MODE`, `normalizedAuthMode`, `isAuthModeValue`, `AUTH_MODE_ADMIN_ONLY_`, `AUTH_MODE_USER_SIGNUP_`):

- `packages/helpers/src/startup/validation.ts` -- `validateAuthMode()` -> `validateAccountSignupMode()`, reads `ACCOUNT_SIGNUP_MODE` env var
- `packages/helpers/src/index.ts` -- update exports
- `packages/helpers-config/` -- any references to the old names
- `apps/api/src/config/index.ts` -- reads `ACCOUNT_SIGNUP_MODE` env var instead of `AUTH_MODE`
- `apps/api/src/lib/startup/validation.ts` -- update all references
- `apps/api/src/routes/auth.ts` -- update mode checks
- `apps/api/src/controllers/authController.ts` -- update mode checks
- `apps/api/src/schemas/auth.ts` -- update capability imports
- `apps/api/src/lib/mailer/send.ts` -- update `isMailerEnabled()` to check `ACCOUNT_SIGNUP_MODE`
- `apps/api/src/test/setup.ts` -- `AUTH_MODE` -> `ACCOUNT_SIGNUP_MODE`
- `apps/api/src/test/startup-validation-auth-mode.test.ts` -- rename env var in tests
- `apps/api/src/test/auth-*.test.ts` -- rename env var in all auth test files
- `apps/management-api/src/config/index.ts` -- reads `ACCOUNT_SIGNUP_MODE`
- `apps/management-api/src/lib/startup/validation.ts` -- update references
- `apps/management-api/src/controllers/usersController.ts` -- update mode checks
- `apps/management-api/src/test/*.test.ts` -- rename env var
- `apps/web/src/lib/authMode.ts` -- reads `NEXT_PUBLIC_AUTH_MODE` -> `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`
- `apps/web/src/config/env.ts` -- update env var name
- `apps/web/sidecar/src/server.ts` -- update validation
- `apps/web/src/app/(auth)/login/page.tsx` -- update capability reads
- `apps/web/src/app/(auth)/signup/page.tsx` -- update capability reads
- `apps/web/src/app/(auth)/forgot-password/page.tsx` -- update capability reads
- `apps/web/src/app/(auth)/reset-password/page.tsx` -- update capability reads
- `apps/web/src/app/auth/set-password/page.tsx` -- update capability reads
- `apps/web/src/app/(main)/settings/SettingsPageContent.tsx` -- update capability reads
- `apps/management-web/src/components/users/UserForm.tsx` -- update capability reads

### 4. Update env files

- `apps/api/.env.example` -- `AUTH_MODE=` -> `ACCOUNT_SIGNUP_MODE=`
- `apps/api/ENV.md` -- rename and update docs
- `apps/web/sidecar/.env.example` -- `NEXT_PUBLIC_AUTH_MODE=` -> `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE=`
- `infra/env/*.yaml` -- update env var names
- `infra/k8s/base/api/source/api.env` -- `AUTH_MODE=` -> `ACCOUNT_SIGNUP_MODE=`
- `infra/k8s/base/web/source/web-sidecar.env` -- `NEXT_PUBLIC_AUTH_MODE=` -> `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE=`
- `tools/web-perf/lighthouse/.env.api` and `.env.api.example`
- All Playwright config files and E2E specs that reference `AUTH_MODE`

### 5. Update tests

- Every test file that sets `process.env.AUTH_MODE = '...'` must use `ACCOUNT_SIGNUP_MODE`
- E2E specs: update env vars in Playwright configs

## Verification

- `npm run lint && npm run type-check` in Metaboost passes
- All existing tests pass
- No remaining references to `AUTH_MODE` (except in comments explaining the rename if desired)
