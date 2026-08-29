# 225-more-stack

**Master step:** 7.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- **More** tab stack: settings, profile, about, membership placeholders.
- Settings entry can link to theme/locale stubs already present; full settings is Track 16.
- Login/logout entry points live here or on a dedicated Auth screen reachable from More until
  Track 6 auth is wired into shell.

## Acceptance criteria

- More tab navigable with at least Settings + About placeholders
- Logout control reachable when authenticated (coordinates with Track 6)

## Web parity references

- Web Settings / Profile / Membership entry points

## Verification

```bash
rg -n "More|Settings" apps/mobile/src/navigation || true
```
