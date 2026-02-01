# Migration 02L: API Stats Controllers

## Overview

Inline any stats-related Joi schemas and ensure no top-level reusable schemas remain.

## Scope

**Files to modify:**

- `apps/api/src/controllers/stats/*` (all stats controllers)

## Inline-only schemas

- `createStatsTrackEvent*Schema` (playlist, item, clip, channel, account)

## Implementation Steps

1. For each stats controller, move schema definitions inline in the handler.
2. Remove any top-level schema constants if present.
3. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
