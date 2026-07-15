# 03 — Navigation titles i18n

## Scope

Replace hardcoded tab labels and stack `options.title` values in the mobile navigator with
`t()` keys from catalog (reuse consumer `features.*` / settings / membership where possible;
use mobile overlay keys from 01 for Home / More / RSS / Downloads and any missing stack
titles).

Leave `...Placeholder` **body** text and the mini/full player placeholder chrome hardcoded
(dev scaffold). Product-facing menu item labels and stack titles in the More / Library hubs
that users tap must be localized.

Prerequisite: [01-catalog-keys.md](./01-catalog-keys.md) and [02-auth-screens-i18n.md](./02-auth-screens-i18n.md).

## Files

- `apps/mobile/src/navigation/index.tsx` (primary)
- Split navigators only if titles live in child modules — keep changes minimal.

## Implementation notes

- `const { t } = useTranslation();` in components that set titles / menu labels / tab
  `options.title` or `tabBarLabel`. Prefer functions/`useMemo` so language changes re-render
  titles (i18next language change).
- Map (examples — verify exact keys against catalog after 01):

| UI | Key |
| -- | --- |
| Tab Home | `nav.tab.home` (mobile) |
| Tab Search | `features.search.search` |
| Tab My Library | `features.my_library` |
| Tab RSS | `nav.tab.rss` (mobile) |
| Tab More | `nav.tab.more` (mobile) |
| Stack Search / Queue / History / Playlists / Settings / Profile / Membership / About / Podcast / Episode / Clip / Add by RSS | consumer feature/media/settings/membership keys from 01 inventory |
| Downloads | `nav.tab.downloads` or `nav.stack.downloads` (mobile) |
| Search Result / RSS Feeds | mobile overlay stack keys |

- Keep tab / screen `testID`s (`tab-home`, `tab-search`, `tab-my-library`, `tab-more`, etc.).
- Do **not** localize stub placeholder descriptions like “Podcast Detail Placeholder” unless they
  are also used as product chrome (leave per 00-SUMMARY).

## Acceptance criteria

- Tab bar and real stack `title` / hub menu labels use `t()`.
- Placeholder body copy still English (allowed exception).
- Maestro `tab-switch-playback` and auth logout (More → Log out) still pass via testIDs.

## Verification (operator)

Prereqs: **Mobile Metro** `npm run mobile:dev:e2e`, **Mobile E2E API**, devices per HOW-TO-RUN.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- tab-switch-playback,auth-logout
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
