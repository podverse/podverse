# Plan: PR #108 — docker/login-action 3 → 4

**PR**: [podverse/podverse#108](https://github.com/podverse/podverse/pull/108) — chore(deps): bump docker/login-action from 3 to 4

**Scope**: [.github/workflows/publish-alpha.yml](.github/workflows/publish-alpha.yml) (two steps using `docker/login-action@v3`).

## Steps

1. Check out or apply PR #108 (or change both `docker/login-action@v3` to `v4`).
2. v4 uses Node 24 and ESM; no input changes required for typical usage.
3. **Build and verify**: `npm run build:packages` and `npm run lint`.

## Final step

Ensure everything builds and lint passes.
