# 169-fastlane-eas-profiles

**Master step:** 4.20
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `eas.json` profiles: `internal`, `beta`, `production` for iOS and Android.
- No Fastlane lanes in PG-3 (decision 4.1 = EAS).

## Acceptance criteria

- `apps/mobile/eas.json` (or repo-agreed path) defines three profiles
- Profiles referenced by workflows 4.4–4.6

## Verification

```bash
test -f apps/mobile/eas.json
rg -n 'internal|beta|production' apps/mobile/eas.json
```
