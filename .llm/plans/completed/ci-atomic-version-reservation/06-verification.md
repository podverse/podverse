# 06 — Verification on a real `alpha` run (podverse)

## Scope

End-to-end sanity check after Phases 1–4 are merged to the publish pipeline. This
is the gate for declaring podverse aligned with metaboost.

## Pre-flight

- Metaboost atomic-publish-version-reservation has been verified green on a real
  `alpha` run (Phase 0 gate from `00-EXECUTION-ORDER.md`).
- The podverse changes have been merged into `develop`.
- You're ready to push (or PR) `develop` → `alpha`.

## Trigger

Run podverse's promotion script for `alpha` (or PR `develop` → `alpha`). Watch
the **Publish (alpha, beta, main)** workflow on the resulting `alpha` commit.

## Checklist

1. **`validate` job** completes (build / lint / type-check / audit only). The
   `Calculate unified version` step is gone.
2. **`reserve-version` job** runs after `validate`. Logs include:
   - `Reserved version: 0.X.Y-alpha.N`
   - HTTP 201 from the create-ref `curl` (in the happy path).
3. **`publish-base-images` matrix** uses `needs.reserve-version.outputs.version`.
   Both `web-base` and `management-web-base` push with `:0.X.Y-alpha.N` and
   `:alpha`.
4. **`publish-docker` matrix** uses `needs.reserve-version.outputs.version` and
   the same `version` is wired into `BASE_IMAGE` build args for `*-deploy` images.
   All apps push successfully:
   - `api`, `workers`, `management-api`
   - `web-deploy`, `management-web-deploy`
   - `web-runtime-config`, `management-web-runtime-config`
5. **`verify-published-tags`** confirms both tags exist for every app
   (`web-base`, `management-web-base`, `api`, `workers`, `management-api`,
   `web-deploy`, `management-web-deploy`, `web-runtime-config`,
   `management-web-runtime-config`).
6. **Git tag** `0.X.Y-alpha.N` exists at the workflow commit:
   ```bash
   git fetch --tags
   git show-ref --tags | grep '0.X.Y-alpha.N'
   ```
7. **`git-tag-prerelease` job is no longer in the run graph** (after Phase 2
   ships).
8. **`github-prerelease-create`** opens a GitHub Release named
   `0.X.Y-alpha.N`, marked as `prerelease: true`.
9. **`changelog-pr-to-develop`** opens a PR titled
   `chore: archive changelog for 0.X.Y-alpha.N (alpha)`. PR succeeds (no
   `Duplicate header: Authorization` errors).

## Negative tests (manual, optional)

- **Concurrent runs.** Push two empty commits to `alpha` rapidly. Both runs
  succeed; one wins `.N` via 201, the other walks to `.N+1` via 422 retry. Both
  Git tags exist; both image tag sets exist.
- **Override.** `Run workflow → version_override: 0.X.Y-alpha.999`. The reserved
  tag is exactly `0.X.Y-alpha.999`.
- **Exact-tag mismatch guard.** For `version_override` (or `main` RTM), if the
   tag already exists on a different commit, `reserve-version` fails before
   `publish-base-images` / `publish-docker` starts.

## Done criteria

When 1–9 are green, podverse is aligned with metaboost. Move both plan sets from
`active/` to `completed/` per the local plan-lifecycle convention.
