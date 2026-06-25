# Publish scripts

Operator scripts for the develop → staging → main release train. **Agents do not run git push
commands**; the operator runs these locally.

| Script | Purpose | Triggers CI |
| ------ | ------- | ----------- |
| [`bump-version.sh`](bump-version.sh) | Bump `X.Y.Z` in root and workspace `package.json` files | None |
| [`sync-develop-to-staging.sh`](sync-develop-to-staging.sh) | Fast-forward `staging` from `develop`; waits for **Publish (staging)** | [Publish (staging)](/.github/workflows/publish-staging.yml) |
| [`sync-staging-to-main.sh`](sync-staging-to-main.sh) | Fast-forward `main` from `staging`; waits for **Publish (main)**; verifies GHCR tags | [Publish (main)](/.github/workflows/publish-main.yml) |
| [`preflight-rtm-promote.sh`](preflight-rtm-promote.sh) | Read-only RTM checks before main sync | None |

## GHCR helpers

| Script | Purpose |
| ------ | ------- |
| [`../ghcr/getLatestStagingTag.sh`](../ghcr/getLatestStagingTag.sh) | Latest `X.Y.Z-staging.N` for one image path |
| [`../ghcr/verifyProductionTags.sh`](../ghcr/verifyProductionTags.sh) | Confirm `X.Y.Z` and `:latest` after RTM |
| [`../ghcr/lib/podverse-images.sh`](../ghcr/lib/podverse-images.sh) | Shared image list and tag helpers |

## Documentation

- [PUBLISH.md](/docs/operations/deploy/PUBLISH.md) — tag patterns and workflow overview
- [PRODUCTION-RELEASE.md](/docs/operations/deploy/PRODUCTION-RELEASE.md) — RTM operator runbook
- [ALPHA-DEPLOYMENT.md](/docs/operations/deploy/ALPHA-DEPLOYMENT.md) — preprod and local alpha

## Typical flow

Run from repo root on **`develop`**:

```bash
./scripts/publish/bump-version.sh
./scripts/publish/sync-develop-to-staging.sh
./scripts/publish/preflight-rtm-promote.sh
./scripts/publish/sync-staging-to-main.sh
```

Requires `gh auth login` — sync scripts use `gh` internally to wait for publish workflows before
exiting.
