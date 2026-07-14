# 068-ci-e2e-stub-job

**Master step:** 5.9
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add a **non-blocking** GitHub Actions job (`.github/workflows/mobile-e2e-stub.yml`) that runs
  the hello-world Maestro flow on a macOS runner when available.
- Trigger via maintainer `/testmobile` on a PR (same permission gate as `/test`), not on every
  `pull_request`. `/testmobile` also runs server CI (`ci.yml`); `/test` remains server-only.
- `continue-on-error: true` or equivalent until harness is stable.
- Must not block server publish workflows.

## Acceptance criteria

- Workflow file exists and is documented as non-blocking / comment-triggered
- Job uses Maestro + simulator boot; skips gracefully if tooling missing (optional)
- Isolation from `publish-staging.yml` / `publish-main.yml`
- Does not auto-run on path-filtered PRs

## Web parity references

- Track 4 workflow isolation (4.7 / 156)

## Verification

```bash
rg -n 'maestro|testmobile|continue-on-error|issue_comment' .github/workflows/mobile-e2e-stub.yml .github/workflows/ci.yml
```
