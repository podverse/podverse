# E2E Verification Scratchpad

This file is a tracked placeholder for the operator's local verification checklist.

For implementation work that requires E2E verification, the agent replaces this placeholder with
the exact scoped commands needed for the current change. The updated scratchpad is working-tree
state, not feature documentation: run the listed commands, review the reports, then restore this
placeholder before committing the feature.

## Current verification

Default **dark** full-bleed chrome (`createStyles` screen fill) now uses `background.secondary`
so Home / tab roots match the black tab bar. Shared token hexes are unchanged.

Leave running (if not already up): **Mobile Metro** (`npm run mobile:dev:e2e`), **Mobile E2E API**,
**Mobile iOS** / **Mobile Android** installs per [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

### Mobile Maestro

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
