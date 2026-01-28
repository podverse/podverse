# Phase 3a: Update Web App Imports

**Dependencies**: Plan 02 must complete first
**Can run in parallel with**: Plans 03b-03i
**Run**: Parallel (Phase 3)

## Overview

Update the web app to import from the new specialized helpers packages.

## Tasks

### 1. Update package.json Dependencies

**In `apps/web/package.json`**, add to dependencies:

```json
"@podverse/helpers-validation": "*",
"@podverse/helpers-requests": "*",
"@podverse/helpers-browser": "*",
"@podverse/helpers-config": "*"
```

Note: `@podverse/helpers` should already be present.

### 2. Update Validation Imports

Search for validation imports in auth/settings forms:

```bash
cd apps/web
grep -r "getEmailErrorKey\|getPasswordErrorKey\|getPassword2ErrorKey\|getPasswordRequirementsInfoKey" src/
```

**Update imports:**

```diff
-import { getEmailErrorKey, getPasswordErrorKey } from '@podverse/helpers';
+import { getEmailErrorKey, getPasswordErrorKey } from '@podverse/helpers-validation';
```

**Files to update (approximately):**

- `src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx`
- `src/components/Auth/AuthSignUpForm.tsx`
- `src/components/Auth/AuthResetPasswordForm.tsx`
- `src/components/Auth/AuthForgotPasswordForm.tsx`
- `src/components/Auth/AuthEmailChangeForm.tsx`

### 3. Update URL Validation Imports

Search for URL validation imports:

```bash
grep -r "isValidHttpUrl\|validateHttpsUrl\|validateUrlForSSRF\|isPrivateIP" src/
```

**If found, update:**

```diff
-import { validateUrlForSSRF } from '@podverse/helpers';
+import { validateUrlForSSRF } from '@podverse/helpers-validation';
```

**Known file:**

- `src/utils/proxy/urlValidator.ts` - Uses URL validation

### 4. Update Browser Utility Imports

Search for clipboard imports:

```bash
grep -r "clipboard\|copyToClipboard" src/
```

**If found, update:**

```diff
-import { copyToClipboard } from '@podverse/helpers';
+import { copyToClipboard } from '@podverse/helpers-browser';
```

### 5. Update Build Script (validate-env.ts)

**`apps/web/scripts/validate-env.ts`** uses startup validation utilities.

```bash
grep -r "validateRequired\|validateOptional\|validateBoolean" scripts/
```

**Update imports:**

```diff
-import { validateRequired, validateOptional } from '@podverse/helpers';
+import { validateRequired, validateOptional } from '@podverse/helpers-config';
```

### 6. Install and Build

```bash
cd apps/web
npm install
npm run build
```

## Verification

- [ ] New package dependencies added (validation, requests, browser, config)
- [ ] Validation imports updated (~5 form files)
- [ ] URL validation imports updated
- [ ] Browser utility imports updated (if any)
- [ ] Build script imports updated (validate-env.ts)
- [ ] No remaining imports from old paths
- [ ] Web app builds successfully
- [ ] `npm run lint` passes
- [ ] No winston or bignumber in node_modules

## Files Modified

- `apps/web/package.json`
- Auth/settings form files (~5 files)
- `src/utils/proxy/urlValidator.ts`
- Any files using clipboard utilities
- `scripts/validate-env.ts`
