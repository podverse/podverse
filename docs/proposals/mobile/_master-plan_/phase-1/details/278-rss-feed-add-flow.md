# 278-rss-feed-add-flow

**Master step:** 9.19
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Feed URL input + validation + add-by-rss mutation on the RSS tab.
- Validate URL client-side; call the add-by-rss resource mutation via `ApiRequestService`.
- Success updates the added-feeds list (9.20); error surfaces inline via 8.11 error affordance.

## Acceptance criteria

- Valid feed URL adds and appears in the list; invalid URL shows validation error
- Uses same add-by-rss resource semantics as web
- `testID`s: `rss-url-input`, `rss-add-submit`, `rss-add-error`

## Web parity references

- [`apps/web/src/components/AddByRSS`](/apps/web/src/components/AddByRSS)
- Parity skills: **add-by-rss-parity-sync**, **add-by-rss-components-sync**

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
