# 159-signing-secrets-setup

**Master step:** 4.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Document required GitHub Actions / EAS secrets: `EXPO_TOKEN`, Apple/Google credentials via EAS
  credentials manager.
- Never commit keystores, provisioning profiles, or API keys.
- Separate credentials for `.next` app vs future prod convergence (4.25).

## Architecture notes

- Prefer EAS-managed credentials over checking secrets into GH for iOS certs when possible.
- Rotate tokens documented in runbook.

## Acceptance criteria

- Secrets checklist in runbook
- `.gitignore` already excludes signing artifacts; confirm
- No plaintext secrets in workflows

## Verification

```bash
rg -n 'EXPO_TOKEN|secrets\\.|credentials' .github/workflows/mobile-*.yml docs/operations/mobile/
```
