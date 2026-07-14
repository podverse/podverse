# 069-e2e-test-env-doc

**Master step:** 5.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Document mobile E2E API base URL / seed expectations.
- Reuse Podverse test-env patterns conceptually (`podverseTestEnv` ports for API when mobile hits
  local API); hello-world may not need API yet — document future auth/home flows.

## Acceptance criteria

- Doc under `apps/mobile/e2e/` or APPS-MOBILE § Testing
- States when API must be up vs UI-only flows

## Web parity references

- [packages/helpers-config](/packages/helpers-config) test env (conceptual)
- `make test_deps` / web E2E ports (do not reuse Playwright ports blindly — document chosen mobile
  API URL)

## Verification

```bash
rg -n 'API|base URL|seed|test.env|test_deps' apps/mobile/e2e/ apps/mobile/APPS-MOBILE.md
```
