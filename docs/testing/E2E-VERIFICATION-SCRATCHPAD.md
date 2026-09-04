# E2E Verification Scratchpad

This file is a tracked placeholder for the operator's local verification checklist.

For implementation work that requires E2E verification, the agent replaces this placeholder with
the exact scoped commands needed for the current change. The updated scratchpad is working-tree
state, not feature documentation: run the listed commands, review the reports, then restore this
placeholder before committing the feature.

## Current verification

Search / Home list chrome: last `HomeFeedRow` has no bottom hairline; row vertical padding is
`spacing.base`; row artwork is 60×60; title/subtitle use column `gap` (`sm`). Hairline dividers
between rows; stronger full-width rule under Search chips.

Leave running (if not already up): **Mobile Metro** (`npm run mobile:dev:e2e`), **Mobile E2E API**,
**Mobile iOS** / **Mobile Android** installs per [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

### Unit (Root)

```bash
npm run test -w @podverse/helpers -- src/lib/searchListPrefs.test.ts
npm --prefix apps/mobile run test -- src/prefs/tabLayout.test.ts
```

### Web (Root)

```bash
make e2e_test_web_report_spec SPEC=e2e/search-page.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

### Mobile Maestro

```bash
npm run mobile:e2e:test -- search
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
