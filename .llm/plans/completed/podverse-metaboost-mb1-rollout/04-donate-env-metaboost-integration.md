# 04 - Donate Env MetaBoost Integration

## Objective

Allow the donation boost form to optionally use MB1 behavior from env/runtime config (not RSS), with safe fallback to current behavior.

## Scope

- Env/runtime config schema and loading.
- Donation form wiring to pass resolved MetaBoost.
- Shared standard resolver usage (same as RSS-driven boosts).

## Implementation Plan

1. Add optional donation MetaBoost config fields:
   - standard
   - node
   - (optional additional fields only if needed by runtime model)
2. Wire fields through web runtime config pipeline:
   - config source
   - runtime config type
   - sidecar allowlist/serialization if required
3. Parse/validate in one place:
   - use shared standard resolver and URL normalization behavior.
4. Update donate form:
   - if valid supported standard config exists, pass `metaBoost` into `BoostFormBase`.
   - otherwise pass null (current behavior).
5. Keep donation independent from RSS inputs:
   - no feed/item dependency introduced.

## Files to Update

- `apps/web/src/config/index.ts`
- `apps/web/src/config/runtime-config.ts`
- `apps/web/sidecar/src/server.ts` (if runtime exposure requires)
- `apps/web/src/components/Boost/BoostAppDonateForm.tsx`
- optional helper under `apps/web/src/utils/value/`

## Test Plan

- config absent: donate form remains legacy-only.
- config present and valid MB1: metadata/confirm flow activates.
- config present but invalid/unsupported: fallback path, no crash.

## Acceptance Criteria

- Donation form can opt into MB1 with env/runtime config.
- Existing donation setups without new env vars remain unchanged.
