# Plan: PR #109 — docker/setup-buildx-action 3 → 4

**PR**: [podverse/podverse#109](https://github.com/podverse/podverse/pull/109) — chore(deps): bump docker/setup-buildx-action from 3 to 4

**Scope**: [.github/workflows/publish-alpha.yml](.github/workflows/publish-alpha.yml) (two steps using `docker/setup-buildx-action@v3`).

## Steps

1. Check out or apply PR #109 (or change both to `@v4`).
2. v4: Node 24 default; deprecated inputs removed — confirm no deprecated inputs are used.
3. **Build and verify**: `npm run build:packages` and `npm run lint`.

## Final step

Ensure everything builds and lint passes.
