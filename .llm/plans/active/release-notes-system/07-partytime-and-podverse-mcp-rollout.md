# 07 — partytime and podverse-mcp rollout

## Goal

Single-package repos get the same contract with a smaller footprint. Work only in `../partytime`
and `../podverse-mcp`; do not edit podverse.

Both repos guide agents through `AGENTS.md` (no `.cursor/rules/`). Each already has a
"Release notes" section added during planning that says to suggest notes with publish steps.

## Shared

- Copy `scripts/release-notes/` from podverse (with tests and the source header from 06).
- `release-notes.config.json` with one app: `id` = repo name, `dir: "."`, `audience: developer`,
  no store block.
- Notes live at `release-notes/X.Y.Z.md` in the repo root.
- No staging line: Working notes keep only `### Unreleased`; `stamp-staging` is not wired.
- Expand the `AGENTS.md` "Release notes" section: add a line in the same change for every
  user-visible library or tool change (`npm run release-notes:add -- --text "..."`), never edit a
  frozen file, never run freeze or publish scripts.
- Add `.cursor/hooks.json` with the same two hooks as podverse, guard list adjusted per repo.

## partytime

Repo facts: version `5.0.15`, formal tags `vX.Y.Z` (`v5.0.15`), release via
`./scripts/publish/release.sh X.Y.Z` on `develop` (bumps, merge-commits into `main`, tags,
publishes to npm from the tag). No git hooks today; CI is `.github/workflows/main.yml` (test matrix).

1. Config `formalTagPattern: "^v(\\d+\\.\\d+\\.\\d+)$"`. Teach `lib/version.mjs` to read the
   version from the capture group so `v` prefixes work everywhere.
2. npm scripts `release-notes:*` (no Makefile in this repo).
3. `scripts/publish/release.sh X.Y.Z`: before bumping, refuse unless `release-notes/X.Y.Z.md`
   exists and is frozen (`check --release X.Y.Z`). After the tag push, print the operator command
   `gh release create vX.Y.Z --notes-file <(node scripts/release-notes/compose.mjs --version X.Y.Z --format github)`
   instead of running it.
4. Add a `release-notes` step to `main.yml` (pull requests only) running `check --range`.
5. Add `scripts/git-hooks/pre-push` running `check --range` plus an `install-hooks.sh`, wired from
   a `prepare` script, matching podverse's pattern.
6. Seed `release-notes/5.0.16.md` (or the next version the operator names) from
   `git log v5.0.15..HEAD -- src`.
7. Update `scripts/publish/README.md` with the order: finalize prompt, `npm run release-notes:freeze
   -- --version X.Y.Z`, commit, `./scripts/publish/release.sh X.Y.Z`, `gh release create`.

## podverse-mcp

Repo facts: version `1.0.0`, no tags, built with Nix (`flake.nix`, `update-hash.sh`), no publish
scripts.

1. Config with `formalTagPattern: "^v?(\\d+\\.\\d+\\.\\d+)$"`.
2. npm scripts `release-notes:*`. These add no dependencies, so `npmDepsHash` does not change;
   confirm `package-lock.json` is untouched.
3. Seed `release-notes/1.0.0.md` from the full history (no tag yet).
4. New files must be `git add`-ed before `nix build` (repo `AGENTS.md` rule); say so in the
   operator commands.
5. No publish gate until the repo tags releases. Note in `AGENTS.md` that the first tag should be
   cut only after `1.0.0.md` is frozen.

## Done when

- Both repos pass their `release-notes:check` with a seeded draft.
- partytime's `release.sh` refuses to release without frozen notes.
- The response lists operator commands per repo in run order, including `git add` for
  podverse-mcp.
