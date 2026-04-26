# Staging and main: image tags and Git promotion (this repo)

This document describes how **Publish (staging)** and **Publish (main)** work in this repository. Workflows: [`.github/workflows/publish-staging.yml`](../../.github/workflows/publish-staging.yml), [`.github/workflows/publish-main.yml`](../../.github/workflows/publish-main.yml).

## Git branch mirrors (develop → staging → main)

- **`develop`:** all product work lands here.
- **`staging`:** a **fast-forward mirror of `develop`** at the preprod milestone when you run [`sync-develop-to-staging.sh`](../../scripts/publish/sync-develop-to-staging.sh) (or the equivalent PR). It should not accrue its own long-lived feature commits.
- **`main`:** a **fast-forward mirror of `staging`** when you run [`sync-staging-to-main.sh`](../../scripts/publish/sync-staging-to-main.sh) (or the equivalent PR) after **Publish (staging)** is green. **Do not** advance **`main` directly from `develop`**; it should reflect the line you already built in the staging pipeline.

## Staging branch: `X.Y.Z-staging.N`

- **Base version** `X.Y.Z` comes from the root `package.json` `version` field (prerelease suffix stripped for `BASE`).
- After **`validate`**, **`reserve-version`** reserves the next `N` and creates a **git ref** `refs/tags/X.Y.Z-staging.N` on the **staging** push commit (`github.sha`).
- **Images** in GHCR are tagged `ghcr.io/<this-repo>/<app>:X.Y.Z-staging.N` and `:staging` (floating).
- **`verify-published-tags`** fails the workflow unless every app in the list below has both tags in the registry.
- When verification succeeds, **refs/tags/staging** (lightweight) is moved to the build commit.
- A **GitHub prerelease** is created for tag `X.Y.Z-staging.N` when the run succeeds.

**Images in this repo (staging / main):** `web-base`, `management-web-base`, `api`, `workers`, `management-api`, `web-deploy`, `management-web-deploy`, `web-runtime-config`, `management-web-runtime-config`.

**Order note:** The git ref is created **before** all images finish building; a failed publish after that can leave a tag on the commit without a complete image set. Treat failed runs as unusable; orphan tags are rare in practice.

## `main` branch: promote without rebuild

- **Trigger:** `push` to `main` (or `workflow_dispatch`). Merging `staging` → `main` is a normal trigger.
- **Images:** The workflow uses **`crane copy`** in GHCR: for each app, the manifest tagged `X.Y.Z-staging.M` is copied to `X.Y.Z` and to `latest`. **No new build**; same digest, additional tag names.
- **Choosing `M`:** For each app, the max `N` for `X.Y.Z-staging.N` is read from the registry; the workflow uses the **minimum** of those per-image maxima so every image shares one promoted line.
- **Git:** A ref `refs/tags/X.Y.Z` is created on the **`main` push commit** (merge result), and a **production** GitHub Release may be created for that tag. The staging pre-release tag remains on the **staging** build commit; **refs/tags/latest** is moved to the **main** commit. The immutable `X.Y.Z-staging.N` tag is not moved.

## Other repositories

**Metaboost** uses the same pattern with different app image names. See the Metaboost copy of this doc under `metaboost/docs/development/STAGING-MAIN-PROMOTION.md` if you work across both monorepos.

## Optional stricter policy (not implemented)

- Defer the staging **git** ref until after all images are verified (would complicate atomic `N` reservation).
- Restrict `main` publish to only certain merge sources (use process: merge staging when ready to promote).
