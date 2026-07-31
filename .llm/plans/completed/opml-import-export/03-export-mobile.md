# 03 — OPML Export: mobile More tab

**Phase 1, parallel with 02.** Depends on **01**.

## Scope

Consolidate the mobile More "OPML" entry into a single row → OPML screen with an Export button and a
brief description. Import button wired later in **08**.

## Mobile navigation

1. In [apps/mobile/src/navigation/index.tsx](/apps/mobile/src/navigation/index.tsx):
   - **Consolidate rows**: replace the two placeholder rows `opml-import-entry` /
     `opml-export-entry` (lines 747-760) with a single **OPML** row (testID `more-nav-opml`,
     label `opml.opml`) → navigates to a new `MoreOpml` route.
   - **Screen route**: replace the separate `MoreOpmlImportScreen`/`MoreOpmlExportScreen`
     placeholders (lines 788-796) with one `MoreOpmlScreen` route `MoreOpml`. Keep import/export
     deep-link route names or collapse to `opml` — update `MORE_STACK_ROUTES` + linking
     (lines 658-667, 749-758) accordingly.
   - Update the Library hub OPML entry points (lines 656-669) to navigate to the single `MoreOpml`
     route via `getParent()?.navigate('More', { screen: 'MoreOpml' })`.
2. **New screen** `apps/mobile/src/screens/more/MoreOpmlScreen.tsx`:
   - Simple scrollable view with two sections (Export now; Import placeholder added in 08).
   - Export section: description text + Export button (testID `opml-export-button`).
   - On press: `createMobileApiRequestService()?.reqAccountOpmlExport()` (via
     `requestWithMobileAuthRefresh`) → OPML text → write to a temp file with
     [expo-file-system](/apps/mobile/package.json) (already installed) → present the OS share sheet
     (add `expo-sharing` if not present; otherwise use `Share` from RN). Filename
     `podverse-opml-export-<date>.opml`.
   - Loading/notice via inline `<Text>` pattern (like
     [AddByRssRootScreen.tsx](/apps/mobile/src/screens/rss/AddByRssRootScreen.tsx) 24, 201);
     errors via an inline error key.

## i18n

3. Add mobile-facing OPML strings. Cross-app copy (titles/descriptions/buttons) can live in
   `packages/i18n-catalog/consumer/originals/en-US.json` `settings.opml.*` (shared with web from
   **02**); mobile-only chrome (row label, nav title) in
   `packages/i18n-catalog/mobile/originals/en-US.json`. Run mobile i18n compile
   (`npm run i18n-compile` in apps/mobile; do not hand-edit `apps/mobile/i18n/compiled/`).

## Tests (Maestro — see mobile-e2e-screenshots skill)

- New/updated flow `apps/mobile/e2e/opml.yaml`: open More → OPML → assert Export button renders;
  screenshot. (File-share OS sheet is out of Maestro scope; assert button + press handler wiring.)

## Verification (operator)

Mobile Metro + Mobile iOS/Android must be running (see HOW-TO-RUN).

```bash
npm run mobile:e2e:test -- opml
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
