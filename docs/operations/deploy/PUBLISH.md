# Publish images (staging, main)

Two separate workflows build or promote release artifacts:

1. [`.github/workflows/publish-staging.yml`](/.github/workflows/publish-staging.yml) (display name **“Publish (staging)”**) — runs on every push to **`staging`** (or `workflow_dispatch`).
2. [`.github/workflows/publish-main.yml`](/.github/workflows/publish-main.yml) (display name **“Publish (main)”**) — runs on every push to **`main`**. It does **not** rebuild app images; it **promotes** the existing `X.Y.Z-staging.N` line from GHCR to immutable `X.Y.Z` and floating **`:latest`**, then creates the Git tag and a **non-prerelease** GitHub Release.

| Git branch | What happens      | Immutable image / tag pattern           | Floating GHCR tag |
| ---------- | ----------------- | --------------------------------------- | ----------------- |
| `staging`  | Full build + push | `X.Y.Z-staging.N` (N via Git ref API)   | `staging`         |
| `main`     | Promote only      | `X.Y.Z` (from root `package.json` base) | `latest`          |

**GitHub Releases:** Staging prereleases and main production releases get a short auto-generated description. Maintain richer notes on GitHub when needed.

**Promotion scripts** (under `scripts/publish/`): `sync-develop-to-staging.sh`, then (after a green staging build, when you want RTM) `sync-staging-to-main.sh`. There is no separate `beta` publish line; use **`staging`** for preprod builds and **`main`** to ship.

**Promotion:** all product changes land on **`develop`**. **Order:** fast-forward **`staging` from `develop`**, then after **Publish (staging)** succeeds, fast-forward **`main` from `staging`** (do **not** point `main` directly at `develop`). **`staging` and `main` have no feature commits of their own**; they are mirrors at different milestones in the same train.

## Runtime config lifecycle (web + management-web)

For local CLI and local Docker parity, both Next.js apps use the same runtime-config contract:

- `RUNTIME_CONFIG_URL` is the only required app-process env var.
- `instrumentation.ts` prewarms sidecar config when available.
- Root layout performs request-time hydration (`setRuntimeConfig`) and injects `RuntimeConfigScript` for the browser.
- `getRuntimeConfig()` falls back to `process.env` if sidecar config is temporarily unavailable in the current process.

---

## Git branch `staging`: prerelease `X.Y.Z-staging.N` (detail)

Pushes to the **`staging`** branch build images tagged **`X.Y.Z-staging.N`** and a floating **`:staging`** tag. The in-cluster “alpha” **environment / namespace** (e.g. `podverse-alpha`) is separate from the **Git** branch name.

## Naming (Git branch, semver, cluster)

| Name                                                | Meaning                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Git branch **`staging`**                            | Triggers the build-and-push publish workflow; fast-forward from `develop` (see `sync-develop-to-staging.sh`).                               |
| Git branch **`main`**                               | Triggers the promote-only workflow; fast-forward from `staging` after preprod, not directly from `develop` (see `sync-staging-to-main.sh`). |
| **`X.Y.Z-staging.N`** / **`:staging`**              | **Image** tags. Not a Kubernetes namespace name (e.g. `podverse-alpha` in-cluster is separate).                                             |
| **Environment / namespace** (e.g. `podverse-alpha`) | **Deployment** target. Independent of the word “staging” in the image tag.                                                                  |

---

## What gets published (staging workflow)

Base images (for Next.js app builds) are built first, then app images. All are pushed to GHCR:

| Image                           | Role                                      |
| ------------------------------- | ----------------------------------------- |
| `web-base`                      | Builder base for the web app image        |
| `management-web-base`           | Builder base for the management web image |
| `api`                           | Podverse API                              |
| `workers`                       | Background workers                        |
| `management-api`                | Management API                            |
| `web-deploy`                    | Web app (production bundle)               |
| `management-web-deploy`         | Management web (production bundle)        |
| `web-runtime-config`            | Web runtime-config sidecar                |
| `management-web-runtime-config` | Management web runtime-config sidecar     |
| `extension-prometheus`          | OTLP → Prometheus extension sidecar       |

Each image is tagged with **`:staging`** and an immutable **version** tag `X.Y.Z-staging.N`. The base `X.Y.Z` comes from root `package.json` (prerelease stripped). The `reserve-version` job creates `refs/tags/X.Y.Z-staging.N` at the workflow commit via the GitHub Git Refs API. Promotion state is branch-based (`refs/heads/staging`, `refs/heads/main`), not moving Git tags.

On first publish when GHCR has no package for an image, tag discovery can bootstrap at **`X.Y.Z-staging.0`**.

---

## Main workflow (promote)

Pushes to **`main`** do not run `docker build` for these apps. The job picks a single staging line: **the minimum, across all images, of each image’s maximum `N` for the base `X.Y.Z` from `package.json`** on the push commit, so the same `BASE-staging.M` is used for every app. [crane](https://github.com/google/go-containerregistry) copies each image to **`X.Y.Z`** and **`:latest`**, then a Git tag `X.Y.Z` and a **non-prerelease** GitHub Release are created. See [`.github/workflows/publish-main.yml`](/.github/workflows/publish-main.yml).

---

## How to publish

Run from repo root on **`develop`** (see [PRODUCTION-RELEASE.md](PRODUCTION-RELEASE.md)):

```bash
./scripts/publish/bump-version.sh
./scripts/publish/sync-develop-to-staging.sh
./scripts/publish/preflight-rtm-promote.sh
./scripts/publish/sync-staging-to-main.sh
```

- **`sync-develop-to-staging.sh`** pushes `staging` and waits for **Publish (staging)** to finish.
- **`sync-staging-to-main.sh`** pushes `main` and waits for **Publish (main)** (promote → verify →
  release), then runs `verifyProductionTags.sh`.
- **Optional (staging only):** `version_override` on manual **Publish (staging)** dispatch (e.g.
  `1.0.0-staging.5`).

Do **not** fast-forward **`main` directly from `develop`**.

---

## How to consume the images

Replace the image path with your repository (e.g. `ghcr.io/podverse/podverse/...`).

**Floating (latest staging from the staging branch pipeline):**

```bash
docker pull ghcr.io/podverse/podverse/api:staging
docker pull ghcr.io/podverse/podverse/web-base:staging
docker pull ghcr.io/podverse/podverse/management-web-base:staging
docker pull ghcr.io/podverse/podverse/web-deploy:staging
docker pull ghcr.io/podverse/podverse/web-runtime-config:staging
docker pull ghcr.io/podverse/podverse/workers:staging
docker pull ghcr.io/podverse/podverse/management-api:staging
docker pull ghcr.io/podverse/podverse/management-web-deploy:staging
docker pull ghcr.io/podverse/podverse/management-web-runtime-config:staging
```

**Immutable (staging line):** pin a specific `X.Y.Z-staging.N` (same as the Git tag) for reproducible deploys.

**Production:** use **`X.Y.Z`** or **`:latest`** after a successful `Publish (main)` run for that version. For reproducible source checkouts, pin immutable version tags (`X.Y.Z`, `X.Y.Z-staging.N`) or explicit branch refs (`refs/heads/main`, `refs/heads/staging`).

See [ALPHA-DEPLOYMENT](ALPHA-DEPLOYMENT.md) for the full preprod flow, and the [K8S skill](/.cursor/skills/k8s/SKILL.md) for overlay `newTag` conventions under `infra/k8s/alpha/`.

## Workflow reference

- **Staging (build + push):** [`.github/workflows/publish-staging.yml`](/.github/workflows/publish-staging.yml)
- **Main (promote + RTM):** [`.github/workflows/publish-main.yml`](/.github/workflows/publish-main.yml)
- **GHCR tag discovery** (for smart-start and verification): `GHCR_REGISTRY_TOKEN` (recommended) or `GITHUB_TOKEN`; see [SECRETS](SECRETS.md).

## Atomic version reservation

The **staging** `reserve-version` job reserves a version by creating a Git ref via the GitHub API. It increments `N` on `422` until a new tag is reserved. For `version_override` with an exact tag, `422` is accepted only when the tag already points at the same commit. For **`main`**, the promote workflow does not use the same increment loop; it selects an existing `X.Y.Z-staging.N` line. `git ls-remote` is used only as a starting hint to choose `N` on staging.
