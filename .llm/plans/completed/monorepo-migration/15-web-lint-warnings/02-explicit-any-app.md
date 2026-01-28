# Phase 2: Fix Explicit Any in App Files

**Status:** Pending

## Overview

Fix 7 `@typescript-eslint/no-explicit-any` warnings in app/ directory files.

## Files to Modify

### 1. `src/app/email-change-verifying/EmailChangeVerifyingClient.tsx` (1 warning)

- Line 47:21

### 2. `src/app/global-error.tsx` (3 warnings)

- Line 13:109
- Line 15:31
- Line 64:107

### 3. `src/app/membership/page.tsx` (2 warnings)

- Line 27:29
- Line 71:33

### 4. `src/app/verify-email/VerifyEmailClient.tsx` (1 warning)

- Line 47:21

## Approach

- Replace `any` with specific types from the codebase
- Use `unknown` with type guards for truly dynamic data
- Check error handling patterns - often `any` is used in catch blocks
