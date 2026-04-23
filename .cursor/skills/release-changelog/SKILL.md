---
name: release-changelog
description: "Keep the upcoming release note buffer updated on develop; ties into automated publishes (alpha, beta, main) and GitHub release/archive workflow."
---

# Release changelog (Podverse)

## When to use

When you land user-visible, security/ops, or other **significant** work that should be mentioned in release communication—not every small refactor or internal-only change.

## What to update

- Edit **[`docs/operations/CHANGELOG-UPCOMING.md`](../../docs/operations/CHANGELOG-UPCOMING.md)** on **`develop` only** (not on `alpha`, `beta`, or `main`).

## Conventions

1. **Order** — **Most important first** (e.g. breaking behavior, data, security, then large features, then smaller fixes; omit tiny chores).
2. **Wording** — One line per item when possible, imperative or short statement; link an issue/PR if helpful.
3. **Markers** — Place new bullets in the `<!-- UPCOMING-AUTO-START -->` … `<!-- UPCOMING-AUTO-END -->` region, or the automation cannot reset that section cleanly after a publish. You can keep fixed intro text **above** the markers.
4. **Brevity** — Match the “concise, not exhaustive” bar; the archive and GitHub Release are snapshots, not a full change history.

## Related automation

- CI builds images, creates a **Git tag** matching the full semver, opens a **GitHub Release** from this file, and (on success) opens a **PR to `develop`** that appends an archive and clears the auto region.
- **Base** `X.Y.Z` in `package.json` is set by you via `scripts/publish/bump-version.sh`; **prerelease** `.N` is computed in Actions. See [`docs/operations/ALPHA-DEPLOYMENT.md`](../../docs/operations/ALPHA-DEPLOYMENT.md).
