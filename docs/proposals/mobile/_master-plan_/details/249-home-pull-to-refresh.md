# 249-home-pull-to-refresh

**Master step:** 8.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add pull-to-refresh to each Home media-type sub-feed via `RefreshControl` on the feed list.
- Refresh re-fetches the active media-type data set; shows the native refresh spinner while pending.
- Debounce/guard against overlapping refreshes.

## Acceptance criteria

- Pull-to-refresh works for every media type on iOS + Android
- Spinner tint uses theme tokens; list state preserved on failure
- No duplicate fetch storms when refreshing rapidly

## Web parity references

- Web refetch semantics per media type ([`HomePageList.tsx`](/apps/web/src/app/HomePageList.tsx));
  pull-to-refresh is a mobile-native affordance (no web pixel counterpart)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
