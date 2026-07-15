# 220-tab-navigator-scaffold

**Master step:** 7.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add React Navigation (`@react-navigation/native`, bottom-tabs, native-stack as needed) to
  `apps/mobile`.
- Root: bottom tab navigator with exactly five tabs: **Home**, **Search**, **My Library**, **RSS**,
  **More**.
- Replace hello-world-as-root with navigator shell; keep HelloWorld as Home placeholder until
  Track 8.
- Theme tab bar from design tokens; i18n labels when catalog keys exist (English stub OK).
- `testID`s per tab for Maestro (e.g. `tab-home`, `tab-search`, …).

## Acceptance criteria

- Five tabs visible and switchable on iOS + Android
- Auth bootstrap / ThemeProvider wrap navigator (not inside a single tab)
- No `@podverse/ui` / Next navigation patterns

## Web parity references

- Web primary nav IA (home / search / library / add-by-rss / more) — mobile tabs are the product
  shell
- [DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
