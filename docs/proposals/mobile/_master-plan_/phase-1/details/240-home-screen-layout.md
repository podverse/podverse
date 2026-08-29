# 240-home-screen-layout

**Master step:** 8.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Build the Home screen at `apps/mobile/src/screens/home/HomeScreen.tsx` replacing the HelloWorld
  placeholder in the Home tab (Track 7.2 home stack root).
- Layout: optional header/hero row, a horizontal **media-type selector** chip row (Track 8.2), and a
  scrollable feed area that swaps content per selected media type (Tracks 8.4–8.9).
- Use `FlatList`/`SectionList` for the feed area; do not nest scroll views incorrectly.
- Respect safe-area insets and leave room for the persistent mini player slot (Track 7.7).
- `testID`s: `home-screen`, `home-feed-list`, `home-media-type-selector`.
- Style via `ThemeProvider` tokens only — **no hardcoded hex**.

## Acceptance criteria

- Home renders on iOS + Android with selector row pinned above the scrollable feed
- Layout mirrors web Home information hierarchy (header → selector → list), adapted to RN
- No `@podverse/ui` / SCSS; tokens from `@podverse/design-tokens`

## Web parity references

- Layout/IA: [`apps/web/src/app/HomePageClient.tsx`](/apps/web/src/app/HomePageClient.tsx),
  [`HomePageHeader.tsx`](/apps/web/src/app/HomePageHeader.tsx),
  [`HomePageList.tsx`](/apps/web/src/app/HomePageList.tsx)
- Selector config: [`HomePageDropdownConfig.tsx`](/apps/web/src/app/HomePageDropdownConfig.tsx)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
