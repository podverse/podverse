# 156-ci-isolation-from-server

**Master step:** 4.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Audit that mobile workflows never appear as required checks on server publish paths.
- Document isolation in runbook / APPS-MOBILE.
- Do not add mobile jobs into `publish-staging.yml` / `publish-main.yml`.

## Acceptance criteria

- No `needs:` coupling from server publish → mobile or vice versa
- Short isolation note in docs

## Verification

```bash
rg -n 'mobile-|eas build' .github/workflows/publish-staging.yml .github/workflows/publish-main.yml || echo 'no mobile refs in server publish (ok)'
```
