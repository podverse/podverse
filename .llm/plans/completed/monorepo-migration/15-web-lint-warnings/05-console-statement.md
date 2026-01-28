# Phase 5: Fix Console Statement

**Status:** Pending

## Overview

Fix 1 `no-console` warning.

## File to Modify

### `src/lib/notifications/webpush/requestNotificationPermission.ts`

- Line 33:7 - `console.log` statement

## Approach

Change `console.log` to `console.warn` or `console.error` which are allowed by the ESLint config.
