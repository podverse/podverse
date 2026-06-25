# Production release (RTM)

Operator runbook for promoting Podverse images from the **staging** line to production tags in GHCR.
This does **not** deploy to a cluster; GitOps pin updates are a separate step (see
[REMOTE-K8S-GITOPS](/docs/development/k8s/REMOTE-K8S-GITOPS.md)).

**Mechanism:** [Publish (main)](/.github/workflows/publish-main.yml) uses **crane copy** — same image
digest, additional tag names. No app rebuild on `main`.

For staging builds and tag naming, see [PUBLISH](PUBLISH.md) and
[STAGING-MAIN-PROMOTION](/docs/development/release/STAGING-MAIN-PROMOTION.md).

## Tag semantics

| Tag               | When created                   | Use for                                 |
| ----------------- | ------------------------------ | --------------------------------------- |
| `X.Y.Z-staging.N` | Push to `staging`              | Preprod / alpha pins                    |
| `:staging`        | Push to `staging`              | Floating preprod                        |
| `X.Y.Z`           | Push to `main` (after promote) | **Reproducible production pin**         |
| `:latest`         | Push to `main` (after promote) | Floating RTM (overwritten each promote) |

Prefer immutable **`X.Y.Z`** for anything that must not move. **`:latest`** changes on every
successful RTM promote.

## Prerequisites (first RTM and every RTM)

- [ ] **Publish (staging)** succeeded for the commit on `origin/staging` you intend to ship
- [ ] Root `package.json` base version `X.Y.Z` matches the staging line in GHCR
- [ ] Clean working tree in your Podverse checkout
- [ ] `gh` CLI authenticated (`gh auth status`)
- [ ] `GHCR_REGISTRY_TOKEN` in repo secrets (recommended) or `gh auth token` locally for preflight
- [ ] **Publish (main)** workflow enabled under GitHub Actions (not disabled for the repo)
- [ ] Permission to push **`main`** (bypass on protected branch) **or** ability to merge a PR
      `staging` → `main`

## End-to-end operator flow

Run from repo root on **`develop`**, with a clean working tree and `gh auth login` completed.

```bash
./scripts/publish/bump-version.sh
./scripts/publish/sync-develop-to-staging.sh
./scripts/publish/preflight-rtm-promote.sh
./scripts/publish/sync-staging-to-main.sh
```

| Step | Script                       | What happens                                                               |
| ---- | ---------------------------- | -------------------------------------------------------------------------- |
| 1    | `bump-version.sh`            | Bump `X.Y.Z`, commit, push `develop`                                       |
| 2    | `sync-develop-to-staging.sh` | FF `staging` ← `develop`, push, wait for **Publish (staging)**             |
| 3    | `preflight-rtm-promote.sh`   | Read-only checks before RTM                                                |
| 4    | `sync-staging-to-main.sh`    | FF `main` ← `staging`, push, wait for **Publish (main)**, verify GHCR tags |

No separate monitor step: the sync scripts wait for their workflows before exiting.

### Step detail

#### 1. Preprod

`bump-version.sh` prompts for the next `X.Y.Z`, updates all workspace `package.json` files, and
pushes `develop`. `sync-develop-to-staging.sh` fast-forwards `staging`, pushes, and waits for
**Publish (staging)** to succeed.

#### 2. RTM preflight

`preflight-rtm-promote.sh` checks: fast-forward possible, green **Publish (staging)** for
`origin/staging`, and all 10 GHCR images have the staging line **Publish (main)** will promote.

#### 3. Promote to production tags

`sync-staging-to-main.sh` pushes `main`, waits for **Publish (main)**, and runs
`verifyProductionTags.sh`.

**PR path:** If you merge `staging` → `main` via PR instead of the sync script, wait for
**Publish (main)** in GitHub Actions, then run `./scripts/ghcr/verifyProductionTags.sh` manually.

## Expected outcomes

Example: base `5.4.40`, staging line `.2`.

**GHCR (before):** `ghcr.io/podverse/podverse/api:5.4.40-staging.2`

**GHCR (after):** same digest also tagged `5.4.40` and `latest`

**Git:**

- Tag `5.4.40-staging.2` remains on the staging build commit
- Tag `5.4.40` created on the `main` push commit (same SHA as `staging` after fast-forward)

## Troubleshooting

| Symptom                              | Likely cause                          | Action                                                                                                                        |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Preflight: no staging run for SHA    | Staging not pushed or workflow failed | Re-run sync-develop-to-staging; wait for green                                                                                |
| Preflight: missing `X.Y.Z-staging.N` | Staging publish incomplete            | Check Actions logs; re-run staging publish                                                                                    |
| sync script: audit gate fails        | New advisories since staging CI       | Run `./scripts/audit/audit.sh`; fix or allowlist per [NPM-AUDIT-ALLOWLIST](/docs/development/security/NPM-AUDIT-ALLOWLIST.md) |
| sync script: FF not possible         | `main` diverged from `staging`        | Never merge `develop` → `main` directly; align `main` with process                                                            |
| sync script: push denied             | Branch protection                     | Use PR `staging` → `main`                                                                                                     |
| Publish (main): no staging tag       | Wrong `X.Y.Z` in package.json vs GHCR | Ensure bump + staging sync order is correct                                                                                   |
| Branches equal, no promote           | Already synced without workflow       | Empty push or workflow_dispatch on `main` after confirming need                                                               |
| Verify fails after promote           | GHCR propagation delay                | Wait and re-run verify script                                                                                                 |

## Rollback (operator)

There is no automated rollback workflow. Options:

1. **Cluster / consumers:** Pin a previous immutable tag (`X.Y.Z-staging.N` or an older `X.Y.Z`) in
   deploy config.
2. **GHCR `:latest`:** Re-run `crane copy` from a known-good staging or RTM tag to `:latest` and/or
   `X.Y.Z` (manual; coordinate with team).
3. **Git:** Reverting `main` does not remove GHCR tags; treat registry tags as the deploy source of
   truth.

## Related scripts

See [scripts/publish/README.md](/scripts/publish/README.md).

## Cluster deploy (out of scope here)

Updating `k.podcastdj.com` or other GitOps overlays to pin `X.Y.Z` instead of `X.Y.Z-staging.N` is
documented in [REMOTE-K8S-GITOPS](/docs/development/k8s/REMOTE-K8S-GITOPS.md). Alpha can continue
using staging tags while GHCR carries RTM tags.
