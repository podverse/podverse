# 241-media-type-selector-chips

**Master step:** 8.2
**Model (author + implement):** Auto
**Status:** done

## Scope

- Horizontal, scrollable chip row component `apps/mobile/src/screens/home/MediaTypeSelector.tsx`.
- Options in web order: **Podcasts, Episodes, Clips, Artists, Albums, Tracks**.
- Controlled component: `selected` + `onChange`; active chip visually distinct via tokens.
- Labels localized via i18n (no hardcoded English); reuse existing catalog keys where present.
- `testID` per chip: `home-media-type-<key>` (e.g. `home-media-type-podcasts`).

## Acceptance criteria

- Six options render and are horizontally scrollable on small screens
- Active state uses theme tokens (readable in all themes); no hardcoded colors
- Selecting a chip calls `onChange` with the media-type key

## Web parity references

- Option set + ordering: [`HomePageDropdownConfig.tsx`](/apps/web/src/app/HomePageDropdownConfig.tsx),
  [`apps/web/src/components/ViewSelector/ViewSelector.tsx`](/apps/web/src/components/ViewSelector/ViewSelector.tsx)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
