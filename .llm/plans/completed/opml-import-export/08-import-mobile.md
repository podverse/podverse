# 08 — OPML Import: mobile

**Phase 3, parallel with 07.** Depends on **06** (and **03** for the OPML screen).

## Scope

Add the Import button to the mobile OPML screen: pick an OPML file, upload to the import job, poll
for the report, show results, and handle the 50/hr rate limit with a modal.

## Mobile

1. **Dependency**: add `expo-document-picker` (and `expo-sharing` if not added in 03) via
   `npm --prefix apps/mobile exec -- expo install expo-document-picker` (see **mobile-expo-monorepo**
   skill; then `npm run mobile:install`). Not installed today.
2. In `apps/mobile/src/screens/more/MoreOpmlScreen.tsx` add an **Import** section:
   - Description + Import button (testID `opml-import-button`).
   - On press: `expo-document-picker` pick `.opml`/xml → read text with
     [expo-file-system](/apps/mobile/package.json) →
     `createMobileApiRequestService()?.reqAccountOpmlImport(text)` (via
     `requestWithMobileAuthRefresh`).
   - Poll `reqAccountOpmlImportStatus(requestId)` until `completed`/`failed` (mirror
     [useAddByRssAddFlow.ts](/apps/mobile/src/hooks/useAddByRssAddFlow.ts) 93-99 poll pattern).
     Consider a small hook `useOpmlImport.ts` under `apps/mobile/src/hooks/`.
   - Show a results summary (counts from `totals`) + per-feed outcomes (inline list).
   - After import, refresh subscriptions so new follows appear (invalidate/reload
     [subscriptionsRepository](/apps/mobile/src/data/repositories/subscriptionsRepository.ts)).
3. **Rate-limit UX (new on mobile)**: add `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`
   mirroring web semantics (parse 429 / `report.rateLimited`, compute retry time). Show an RN alert
   modal (pattern like [MediaRowActions.tsx](/apps/mobile/src/screens) RN `Modal`) with:
   "You can add up to {limit} feeds per hour. To finish importing the rest, try again after {time}."

## i18n

4. Reuse `settings.opml.*` consumer keys from **07** where copy is shared; add mobile-only chrome to
   `packages/i18n-catalog/mobile/originals/en-US.json`. Compile mobile i18n.

## Tests (mobile-e2e-screenshots skill)

- Extend `apps/mobile/e2e/opml.yaml`: open More → OPML → assert Import button; if the E2E API
  fixtures path allows a deterministic import, drive it and screenshot the results. (Native document
  picker may be out of Maestro scope — assert button + wiring, use API-backed fixture where possible.)

## Verification (operator)

Mobile Metro + Mobile iOS/Android (+ Mobile E2E API for API-backed) must be running.

```bash
npm run mobile:e2e:test -- opml
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
