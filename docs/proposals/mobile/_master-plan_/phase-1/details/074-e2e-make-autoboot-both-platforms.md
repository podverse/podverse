# 074-e2e-make-autoboot-both-platforms

**Master step:** 5.15
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- `make mobile_e2e_*` calls `ensure-devices.sh e2e` then runs Maestro on **both** E2E devices
  sequentially with explicit `--device`.
- Reports under `.artifacts/mobile-e2e-reports/<ts>/{ios,android}/`.
- Install/Metro failure hints cite E2E device names only.

## Acceptance criteria

- Make boots/creates E2E iOS + Android before Maestro
- Never targets manual device names
- CI stub uses E2E iOS simulator name when booting

## Verification

```bash
rg -n 'ensure-devices|Pro E2E|API_33_e2e' makefiles/local/Makefile.local.e2e.mk scripts/mobile/
```
