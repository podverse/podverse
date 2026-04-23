# 05 — Documentation note (podverse)

## Scope

Podverse currently has no `docs/PUBLISH.md`. Choose one of two minimal approaches
to document the new atomic version reservation behavior. The default is option A.

## Option A (default) — Header comment in the workflow file

Add a comment block at the top of
[.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)
that explains the version selection and tag schema in 5–10 lines:

```yaml
# Publish Docker images to GHCR on alpha, beta, or main.
#
# Version selection is atomic: the `reserve-version` job creates
# `refs/tags/X.Y.Z-{suffix}.N` at the workflow commit via the GitHub Git Refs API
# (POST /git/refs). HTTP 422 ("Reference already exists") triggers `N++` and a
# retry. `git ls-remote --tags` is used only as a starting hint; correctness comes
# from the atomic create.
#
# Tag schema:
#   alpha branch -> X.Y.Z-alpha.N + :alpha (FLOAT_TAG=alpha)
#   beta  branch -> X.Y.Z-beta.N  + :beta
#   main  branch -> X.Y.Z         + :prod
#
# GHCR is image storage and verification only -- it is not used to pick the next N.

name: Publish (alpha, beta, main)
```

## Option B — Brief top-level `docs/PUBLISH.md`

Create `docs/PUBLISH.md` (or another short doc) modeled after the metaboost file,
trimmed to podverse's app set:

- Branch → tag-pattern → floating-tag table.
- "How publish works": describe `validate` → `reserve-version` → `publish-base-images`
  → `publish-docker` → `verify-published-tags` → `github-prerelease-create` →
  `changelog-pr-to-develop` flow.
- "Atomic version reservation" subsection: 5–10 lines on the create-ref pattern.
- Cross-link to the workflow file and the release-changelog skill if podverse has
  one.

Pick option B only if the user wants persistent operator-facing docs; otherwise
keep option A (less surface area to maintain).

## Key files

- [.github/workflows/publish-alpha.yml](../../../../.github/workflows/publish-alpha.yml)
- (option B only) `docs/PUBLISH.md`

## Verification (this step)

- Comment block (or new doc) explains: atomicity, schema per branch, role of GHCR.
- Workflow YAML still parses.
