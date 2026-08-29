# 250-home-state-handling

**Master step:** 8.11
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Shared loading / empty / error state handling for each Home media-type feed.
- Reusable RN components under `apps/mobile/src/components/state/` (e.g. `ListLoading`,
  `ListEmpty`, `ListError` with retry) usable by Track 9 screens too.
- Match web semantics: skeleton/spinner while loading, contextual empty copy, retryable error.
- All copy localized (i18n); no hardcoded English.

## Acceptance criteria

- Each media type shows correct loading, empty, and error states matching web semantics
- Error state offers retry that re-triggers the feed fetch
- Components reused (not re-implemented per feed); tokenized styling

## Web parity references

- [`apps/web/src/components/NoResults`](/apps/web/src/components/NoResults),
  [`apps/web/src/components/LoadingSpinner`](/apps/web/src/components/LoadingSpinner)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
