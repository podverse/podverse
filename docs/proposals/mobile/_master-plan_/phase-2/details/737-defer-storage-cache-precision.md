# 737-defer-storage-cache-precision

**Master step:** P2.3 (operational backlog)
**Model (author + implement):** Auto
**Status:** deferred

## Scope

Follow-ups that are worthwhile but not required for the Downloads / Settings storage pass.

### Clear cache

- A **Clear cache** control that deletes only `cacheDirectory` contents (images/temp), never
  SQLite or the `downloads/` folder.

### Image-cache precision

- Today `CoverImage` uses React Native `Image`, which dumps into the shared HTTP disk cache. We
  cannot cleanly separate “images” from “other cache” without adopting `expo-image` (or writing
  artwork into a dedicated directory we own).

### User-configurable concurrency

- Downloads concurrency is fixed at **5**. A settings control (e.g. 1–5) can land later if users
  need it on constrained networks.

## Acceptance criteria (when picked up)

- Clear cache removes only cacheDirectory and updates the Cache bar.
- Image cache bytes are measurable separately from other cache, or product accepts a single Cache
  bar with Clear that covers all of it.
- Optional concurrency pref updates the runner without breaking pause/resume.

## Web parity references

- N/A.

## Verification

```bash
# Mobile Maestro — when implemented
npm run mobile:e2e:test -- settings-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
