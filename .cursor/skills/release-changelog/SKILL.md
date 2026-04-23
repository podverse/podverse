---
name: release-changelog
description: "Keep the upcoming release note buffer updated on develop; ties into publish-staging (X.Y.Z-staging.N + :staging) and publish-main (RTM) and GitHub release/archive automation."
---

# Release changelog (Podverse)

## When to use

When you land user-visible, security/ops, or other **significant** work that should be mentioned in release communication—not every small refactor or internal-only change.

## What to update

- Edit **[`docs/operations/CHANGELOG-UPCOMING.md`](../../docs/operations/CHANGELOG-UPCOMING.md)** on **`develop` only** (not on `staging` or `main` promotion branches as the editing branch).

## Conventions

1. **Order** — **Most important first** (e.g. breaking behavior, data, security, then large features, then smaller fixes; omit tiny chores).
2. **Wording** — One line per item when possible, imperative or short statement; link an issue/PR if helpful.
3. **Markers** — Place new bullets in the `<!-- UPCOMING-AUTO-START -->` … `<!-- UPCOMING-AUTO-END -->` region, or the automation cannot reset that section cleanly after a publish. You can keep fixed intro text **above** the markers.
4. **Brevity** — Match the “concise, not exhaustive” bar; the archive and GitHub Release are snapshots, not a full change history.

## Naming in CI

- Git branch **`staging`** runs **Publish (staging)**: **`X.Y.Z-staging.N`** and float **`staging`** in GHCR. In-cluster “alpha” (e.g. namespace) in GitOps is separate.
- Pushes to **`main`** run **Publish (main)**: promote to RTM **`X.Y.Z`** and **`:prod`** (no app rebuild in that workflow).
- Canonical table: [`docs/operations/PUBLISH.md`](../../docs/operations/PUBLISH.md). See also [`docs/operations/ALPHA-DEPLOYMENT.md`](../../docs/operations/ALPHA-DEPLOYMENT.md).

## Related automation

- CI builds images, creates a **Git tag** matching the full semver, opens a **GitHub Release** from this file, and (on success) opens a **PR to `develop`** that appends an archive and clears the auto region.
- **Base** `X.Y.Z` in `package.json` is set by you via `scripts/publish/bump-version.sh`; **prerelease** `N` is reserved in Actions. See [`docs/operations/PUBLISH.md`](../../docs/operations/PUBLISH.md) and [`docs/operations/ALPHA-DEPLOYMENT.md`](../../docs/operations/ALPHA-DEPLOYMENT.md).
