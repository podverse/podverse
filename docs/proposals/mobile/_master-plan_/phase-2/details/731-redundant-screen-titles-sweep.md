# 731-redundant-screen-titles-sweep

**Master step:** P2.1.5 / P2.1.10
**Model (author + implement):** Auto
**Status:** done

## Scope

Remove in-body headings that repeat the stack / `HeaderBar` title. The layout rule already forbids
this ([`mobile-screen-layout`](/.cursor/rules/mobile-screen-layout.mdc)); this detail is the sweep.

### Remove

- [`LibraryDownloadsScreen`](apps/mobile/src/screens/library/LibraryDownloadsScreen.tsx) — body
  `Downloads` (loading / error / list header).
- [`AddByRssFeedListScreen`](apps/mobile/src/screens/rss/AddByRssFeedListScreen.tsx) — body title
  that matches the stack title.

### Keep

- Entity names (episode / album / playlist / clip / artist title).
- Real section headings (Up Next, Visible tabs, Podcast About).
- Player panel titles that are not the stack chrome for that surface.

## Acceptance criteria

- No screen whose `HeaderBar` / stack `options.title` is X also renders a large in-body X heading.
- Downloads and Add-by-RSS feed list screens rely on the stack title only.

## Web parity references

- N/A (mobile chrome). Rule: [`mobile-screen-layout`](/.cursor/rules/mobile-screen-layout.mdc).

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
