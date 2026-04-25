---
name: release-changelog
description: "Use version-first changelog files (docs/development/CHANGELOGS/X.Y.Z.md): bump version at start of work and write release notes continuously for staging and main releases."
---


# Release changelog (Podverse)

## When to use

When you land user-visible, security/ops, or other **significant** work that should be mentioned in release communication—not every small refactor or internal-only change.

## What to update

- Use **[`docs/development/CHANGELOGS/X.Y.Z.md`](../../docs/development/CHANGELOGS/)** where `X.Y.Z` is the current base version in `package.json`.
- Bump version **at the start of work** with `scripts/publish/bump-version.sh` so `docs/development/CHANGELOGS/X.Y.Z.md` exists before implementation.
- Keep updating that same semver file continuously as work lands.

## Conventions

1. **Order** — **Most important first** (e.g. breaking behavior, data, security, then large features, then smaller fixes; omit tiny chores).
2. **Wording** — One line per item when possible, imperative or short statement; link an issue/PR if helpful.
3. **Single source** — Staging prereleases and main production releases both read the same `X.Y.Z.md` file.
4. **Brevity** — Match the “concise, not exhaustive” bar; release notes are snapshots, not a full change history.

## Naming in CI

- Git branch **`staging`** runs **Publish (staging)**: **`X.Y.Z-staging.N`** and float **`staging`** in GHCR. In-cluster “alpha” (e.g. namespace) in GitOps is separate.
- Pushes to **`main`** run **Publish (main)**: promote to RTM **`X.Y.Z`** and **`:prod`** (no app rebuild in that workflow).
- Canonical table: [`docs/operations/PUBLISH.md`](../../docs/operations/PUBLISH.md). See also [`docs/operations/ALPHA-DEPLOYMENT.md`](../../docs/operations/ALPHA-DEPLOYMENT.md).

## Related automation

- CI builds images, creates a **Git tag** matching the full semver, and opens a **GitHub Release** from `docs/development/CHANGELOGS/X.Y.Z.md`.
- **Base** `X.Y.Z` in `package.json` is set by you via `scripts/publish/bump-version.sh`; **prerelease** `N` is reserved in Actions. See [`docs/operations/PUBLISH.md`](../../docs/operations/PUBLISH.md) and [`docs/operations/ALPHA-DEPLOYMENT.md`](../../docs/operations/ALPHA-DEPLOYMENT.md).
