# 276-more-settings-entry

**Master step:** 9.17
**Model (author + implement):** Auto
**Status:** done

## Scope

- More tab: settings entry point row/button that navigates to the settings screen.
- Full settings screen (locale, theme, playback defaults, notifications) is Track 16.3 — this is only
  the entry point + navigation wiring in the More stack (Track 7.6).
- Also host entry points for profile, about, membership links (per More stack scope).

## Acceptance criteria

- More tab shows a Settings entry that navigates to the settings route (stub screen OK)
- Entry rows tokenized + localized; `testID` `more-settings`
- No settings logic here (defer to 16.3)

## Web parity references

- [`apps/web/src/app/settings`](/apps/web/src/app/settings),
  [`apps/web/src/components/Settings`](/apps/web/src/components/Settings)
- More stack: [`225-more-stack`](/docs/proposals/mobile/_master-plan_/details/225-more-stack.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
