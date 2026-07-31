# 02 — OPML Export: web Settings tab

**Phase 1, parallel with 03.** Depends on **01**.

## Scope

Add an "OPML" tab to web Settings with an Export option (Import wired later in **07**).

## Web

1. **Add the tab** in [apps/web/src/components/Settings/Settings.tsx](/apps/web/src/components/Settings/Settings.tsx):
   - Extend `TabKey` union (line 18) with `'opml'`.
   - Extend `tabFromQueryParam` (lines 20-24) to accept `'opml'`.
   - Add a login-gated `tabData` entry (like `account`/`profile`, lines 89-109) labeled from a new
     i18n key `settings.opml.opml`.
   - Render `{loggedInAccount && tab === 'opml' && <SettingsOpml />}` (near lines 125-129).
   - Redirect anonymous users away from `opml` (lines 56-62 pattern).
2. **New panel** `apps/web/src/components/Settings/Panels/SettingsOpml/SettingsOpml.tsx`:
   - Use `SettingsSection` + `Button` layout (mirror
     [SettingsAccount.tsx](/apps/web/src/components/Settings/Panels/SettingsAccount/SettingsAccount.tsx)).
   - Section "Export": brief description + Export button.
   - On click: `getApiRequestService().reqAccountOpmlExport()` → Blob → download via
     [utils/fileDownloader.ts](/apps/web/src/utils/fileDownloader.ts) `saveBlobToDisk` (or the inline
     `<a>` pattern in SettingsAccount 34-55). Filename `podverse-opml-export-<date>.opml`.
   - Loading/success via toast helpers; errors via `showToast(..., 'error')` and
     `handleRateLimitAlert` ([utils/rateLimit/rateLimitAlert.ts](/apps/web/src/utils/rateLimit/rateLimitAlert.ts)).
   - Leave a placeholder "Import" section (disabled or "coming soon") OR omit until **07** — prefer
     omit and add in 07 to avoid dead UI.

## i18n

3. Add to `packages/i18n-catalog/consumer/originals/en-US.json` under `settings`:
   - `settings.opml.opml` = "OPML"
   - `settings.opml.export_title`, `settings.opml.export_description`, `settings.opml.export_button`
   - `settings.opml.export_loading`, `settings.opml.export_success`, `settings.opml.export_error`
   Then run i18n compile (do not hand-edit `apps/web/i18n/compiled/`).

## Tests (E2E — see e2e-page-tests skill)

- Add/extend a settings spec: navigate to `/settings?tab=opml`, assert the OPML tab + Export button
  render; screenshot. Use existing seeded logged-in user.

## Verification (operator)

```bash
npm run build:packages
make e2e_test_web_report_spec SPEC=e2e/settings.spec.ts
```

Open `.artifacts/e2e-reports/latest/index.html`.
