# 061-e2e-directory-layout

**Master step:** 5.2
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Create `apps/mobile/e2e/` with a short README describing layout.
- Mirror web area naming where possible (e.g. `hello-world`, later `auth`, `home`).

## Acceptance criteria

- `apps/mobile/e2e/` exists with README
- Flows live under `apps/mobile/e2e/` (not repo-root Playwright trees)

## Verification

```bash
test -d apps/mobile/e2e
test -f apps/mobile/e2e/README.md
```
