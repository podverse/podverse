# 068-ci-e2e-stub-job

**Master step:** 5.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add a **non-blocking** GitHub Actions job (new workflow or job in `mobile-internal.yml`) that runs
  the hello-world Maestro flow on a macOS runner when available.
- `continue-on-error: true` or equivalent until harness is stable.
- Must not block server publish workflows.

## Acceptance criteria

- Workflow file exists and is documented as non-blocking
- Job uses Maestro + simulator boot; skips gracefully if tooling missing (optional)
- Isolation from `publish-staging.yml` / `publish-main.yml`

## Web parity references

- Track 4 workflow isolation (4.7 / 156)

## Verification

```bash
rg -n 'maestro|mobile.e2e|continue-on-error' .github/workflows/
```
