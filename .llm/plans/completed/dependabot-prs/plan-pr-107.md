# Plan: PR #107 — docker/build-push-action 6 → 7

**PR**: [podverse/podverse#107](https://github.com/podverse/podverse/pull/107) — chore(deps): bump docker/build-push-action from 6 to 7

**Scope**: [.github/workflows/publish-alpha.yml](.github/workflows/publish-alpha.yml) (uses `docker/build-push-action@v6` in two places).

## Steps

1. Check out or apply PR #107 (or manually bump `docker/build-push-action` from `v6` to `v7` in the workflow).
2. Remove/update any use of deprecated envs: `DOCKER_BUILD_NO_SUMMARY`, `DOCKER_BUILD_EXPORT_RETENTION_DAYS` (v7 removes them).
3. **Build and verify**: `npm run build:packages` and `npm run lint` in repo root to confirm no unrelated breakage.

## Final step

Ensure everything builds and lint passes.
