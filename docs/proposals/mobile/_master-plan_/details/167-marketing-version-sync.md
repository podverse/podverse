# 167-marketing-version-sync

**Master step:** 4.18
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Keep `apps/mobile` `version` synced with root bump-version / `package.json` version
  (already reads `packageJson.version` in `app.config.ts` — confirm and document).
- Ensure bump-version script includes mobile workspace or documents manual sync.

## Acceptance criteria

- Marketing version source of truth documented
- `app.config.ts` continues to use package version

## Verification

```bash
rg -n 'version|bump-version|apps/mobile' scripts/publish/ apps/mobile/app.config.ts apps/mobile/package.json | head
```
