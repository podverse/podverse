# 07 — OPML Import: web

**Phase 3, parallel with 08.** Depends on **06** (and **02** for the tab).

## Scope

Add the Import section to the web OPML settings tab: pick an OPML file, upload to the import job,
poll for the report, show per-feed results, and handle the 50/hr rate limit with a modal.

## Web

1. In `apps/web/src/components/Settings/Panels/SettingsOpml/SettingsOpml.tsx` add an **Import**
   section above/below Export:
   - Description + a file picker. No prior file-upload art in web — use a hidden
     `<input type="file" accept=".opml,.xml,text/xml,application/xml">` triggered by a `Button`
     (mirror `SettingsAccount` button styling).
   - Read the file (`FileReader.readAsText`) → `getApiRequestService().reqAccountOpmlImport(text)`.
   - Poll `reqAccountOpmlImportStatus(requestId)` on an interval until `completed`/`failed`
     (mirror the add-by-RSS poll cadence in
     [apps/web/src/utils/addByRSS/actions.ts](/apps/web/src/utils/addByRSS/actions.ts) 119-139,
     3s interval; OPML jobs may run longer, raise max attempts / show progress from `totals`).
   - Render a results summary from `totals` + a per-feed list (`outcome` badges) — reuse
     `SettingsSection`; keep it a functional report (counts + expandable list).
2. **Rate-limit UX**: when `report.rateLimited` is present (or a 429 on enqueue), show a modal
   explaining the limit and when to retry. Prefer a colocated `Modal`
   ([packages/ui Modal](/packages/ui/src/components/layout/Modal/Modal.tsx)) like
   [ModalBoostMintRateLimit.tsx](/apps/web/src/components/Modal/ModalBoostMintRateLimit.tsx), message:
   "You can add up to {limit} feeds per hour. To finish importing the rest, try again after {time}."
   Fall back to `handleRateLimitAlert`
   ([utils/rateLimit/rateLimitAlert.ts](/apps/web/src/utils/rateLimit/rateLimitAlert.ts)) for raw 429s.

## i18n

3. Add under `settings.opml.*` in `packages/i18n-catalog/consumer/originals/en-US.json`:
   import title/description/button, `import_in_progress`, `import_result_summary` (with counts vars),
   per-outcome labels (`subscribed`, `enqueued`, `added_by_rss`, `already_subscribed`, `failed`),
   and `import_rate_limited` (with `{limit}` and `{time}`). Compile.

## Tests (e2e-page-tests skill)

- Extend the settings OPML spec: upload a small fixture `.opml` (E2E fixtures path makes the job
  synchronous), assert the results summary renders; screenshot. Add a rate-limit case if the E2E
  harness can force the limit.

## Verification (operator)

```bash
npm run build:packages
make e2e_test_web_report_spec SPEC=e2e/settings.spec.ts
```

Open `.artifacts/e2e-reports/latest/index.html`.
