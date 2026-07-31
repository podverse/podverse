# 03 — My Library Subscriptions list (9.30)

**Master step:** 9.30
**Detail doc:** [602-library-subscriptions-list](/docs/proposals/mobile/_master-plan_/details/602-library-subscriptions-list.md)
**Model:** Codex 5.3
**Depends on:** Step 1 (9b.8 / `subscriptionsRepository`)

## Problem

The new My Library hub (`apps/mobile/src/navigation/index.tsx`) has playlists, queue, history, and
clips, plus a separate RSS tab — but no single "my podcasts / subscriptions" list. Legacy
podverse-rn had a dedicated merged Subscriptions screen.

## Goal

Add a My Library **Subscriptions** entry + screen listing the merged, filterable subscribed list
from `subscriptionsRepository` (directory + add-by-RSS), restoring parity with legacy.

## Approach

1. New screen listing `subscriptionsRepository.list({ filter })` — mixed by default, alphabetical.
   Reuse shared `ListRow` / media-row primitives.
2. Reuse the **same filter control + i18n keys** as Home step 2 (All / Add-by-RSS; default All).
3. Row tap routing by `SubscribedChannel.source`: directory → Podcast detail; add-by-RSS →
   add-by-RSS detail.
4. Register the route in the Library stack (`navigation/index.tsx`) with a `testID`; add a My
   Library hub entry that navigates to it.
5. Match empty/loading/error states used by other library lists.

## i18n

- Reuse `subscriptions.filter.*`; add `library.subscriptions.title` (or reuse an existing library
  heading key). No hardcoded copy.

## Files

- New screen under `apps/mobile/src/screens/library/` (match existing library screen structure).
- `apps/mobile/src/navigation/index.tsx` — route + hub entry + `testID`.
- i18n catalog keys.

## Acceptance criteria

- My Library shows a Subscriptions entry opening a merged, alphabetical list.
- Filter toggles between mixed (All) and add-by-RSS only.
- Directory vs add-by-RSS rows route to the correct detail screens.
- Empty/loading/error states match other library lists.

## Operator verification (end of step)

Prereq: **Mobile Metro** (`npm run mobile:dev`) + a device up. Provide; do not run.

```bash
npm run mobile:e2e:test -- library
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
