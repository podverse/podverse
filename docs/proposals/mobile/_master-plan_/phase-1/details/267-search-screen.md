# 267-search-screen

**Master step:** 9.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Search screen (Search tab root, Track 7.3): query input + results list via the Podcast Index
  search request wrappers on `ApiRequestService`.
- Debounced query; result rows reuse channel/podcast rows; tap → podcast detail (9.1).
- Recent searches / empty prompt optional; loading/empty/error via 8.11.

## Acceptance criteria

- Query returns results from same endpoint semantics as web search
- Layout mirrors web search page (input → results), adapted to RN, tokenized
- Debounce prevents excessive requests; `testID`s: `search-input`, `search-results`

## Web parity references

- [`apps/web/src/app/search`](/apps/web/src/app/search)
  (`SearchPageClient.tsx`, `SearchPageList.tsx`),
  [`apps/web/src/components/PodcastIndex`](/apps/web/src/components/PodcastIndex)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- search
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
