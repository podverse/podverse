# 235-theme-system-appearance

**Master step:** 7.14
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- When `uit` is unset (first launch), optionally derive initial theme from
  `Appearance.getColorScheme()` (`light` → `light`, `dark` → `dark`).
- Document that web defaults to `dark` without system preference — mobile may follow system only
  until user picks a theme in settings.
- After user sets `uit` explicitly, system appearance must not override.

## Acceptance criteria

- First-launch behavior documented in `APPS-MOBILE.md` or theme module comment
- Explicit user theme choice persists over system changes
- No crash when `Appearance` API unavailable

## Web parity references

- Web has no system-theme auto mode v1 — default `dark` always
- **mobile-theme-parity** skill § optional system appearance

## Verification

```bash
grep -rq 'Appearance' apps/mobile/src/theme || grep -rq 'Appearance' apps/mobile/APPS-MOBILE.md
```
