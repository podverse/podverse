# 02 — Scripts and Make targets

## Goal

One set of Node scripts implements every release-notes operation. Rules, hooks, pre-push, CI, and
the publish scripts all call these, so the conventions are enforced by code, not by memory.

Plain Node ESM (`.mjs`), no dependencies beyond Node built-ins and `git` on PATH, so the same files
copy unchanged into metaboost, partytime, and podverse-mcp. Each script reads
`release-notes.config.json` from the repo root.

## Files

```text
scripts/release-notes/
  lib/config.mjs          load + validate release-notes.config.json
  lib/version.mjs         target version, formal/prerelease tag lookup (git tag --list)
  lib/notes-file.mjs      parse/serialize front matter and sections; section-aware edits
  lib/confirm.mjs         requireTty(); confirmTyped(expected, prompt)
  template.mjs            renders a new draft from the 01 spec
  target-version.mjs      prints target version, last formal tag, whether target is already tagged
  new.mjs                 --app <id> | --all; creates missing drafts; idempotent
  add.mjs                 --app <id> --text "..."; appends under ### Unreleased
  check.mjs               validation + coverage (see below)
  carry-forward.mjs       --from X.Y.W --to X.Y.Z; moves draft working notes into the new file
  stamp-staging.mjs       renames ### Unreleased to ### X.Y.Z-staging.N in every file with entries
  freeze.mjs              --version X.Y.Z; validates polished sections, strips working notes, freezes
  compose.mjs             --version X.Y.Z --format github|play|appstore [--app <id>]
  release-notes.test.mjs  node:test suite against a temp git repo fixture
  SCRIPTS-RELEASE-NOTES.md
```

## Who may run what

| Script | Agent | Operator | Why |
| ------ | ----- | -------- | --- |
| `target-version`, `check`, `compose` | yes | yes | read-only |
| `new`, `add` | yes | yes | edit drafts only; refuse frozen files |
| `carry-forward` | no | via `bump-version.sh` | part of the version bump |
| `stamp-staging` | no | via `sync-develop-to-staging.sh` | ties notes to a published tag |
| `freeze` | no | yes | makes notes final |

Operator-only scripts call `requireTty()` first and exit non-zero with "needs an interactive
terminal; it never runs unattended" when stdin is not a TTY. They print a summary (files, versions,
line counts) and require typing the version (`5.5.3`) to continue. They write files but never run
`git`; the calling publish script or the operator commits.

## `check.mjs`

```text
node scripts/release-notes/check.mjs [--range <base>...<head>] [--changed]
  [--release X.Y.Z] [--hook stop|pre-push|ci] [--strict] [--json]
```

Errors (exit 1):

- Front matter missing, unknown keys, or `app`/`version`/`audience` not matching filename + config.
- Filename not a formal semver.
- A file that is `frozen` at the base ref was modified or deleted in the range.
- A frozen file still has `## Working notes` or an empty heading.
- Store block over 500 characters; more than 6 Highlights bullets.
- `--release X.Y.Z`: any configured app is missing `X.Y.Z.md` or it is not frozen.

Coverage warnings (exit 0, or exit 1 with `--strict`):

- An app's `watch` paths changed in the range (minus `ignore`) and its notes file did not.
- `--changed` uses the working tree plus commits since the merge base with the default branch.

Output: human-readable by default; `--json` gives `{ errors: [], warnings: [] }` for hooks.
`--hook ci` also prints `::error::` / `::warning::` annotations.

## `stamp-staging.mjs`

1. Target version from `lib/version.mjs`; next N = highest `X.Y.Z-staging.N` tag + 1 (0 if none).
   The caller runs `git fetch --tags` first.
2. For each file with lines under `### Unreleased`: rename that heading to `### X.Y.Z-staging.N`
   and insert a fresh empty `### Unreleased` above it.
3. Print the files changed and the stamped tag. No-op with a message when nothing is unreleased.

## `freeze.mjs`

1. `requireTty`, then typed confirmation of the version.
2. Refuse if any configured app's draft still has an empty polished section and non-empty
   working notes (the finalize prompt has not run).
3. Create missing files for apps with nothing to report, using the "no changes" lines from 01.
4. Remove `## Working notes` and empty headings; set `status: frozen`, `frozen_at: <today>`.
5. Run `check --release X.Y.Z`; print the exact `git add` / `git commit` commands for the operator.

## `compose.mjs`

- `github`: `# <Product> X.Y.Z`, then each user app's polished sections, then each developer app
  in a `<details><summary>` block. Apps with the "no changes" line are omitted.
- `play`: the mobile Store block wrapped as `<en-US>…</en-US>`, plus other locales when present.
- `appstore`: the Store block as plain text.

## `carry-forward.mjs`

Move every working-notes line from `X.Y.W.md` (draft) into `X.Y.Z.md` under
`### Carried from X.Y.W`, keeping staging subsections as nested bullets; delete the old draft.
Refuse when the old file is frozen.

## Make targets

New `makefiles/release/Makefile.release-notes.mk`, included from the root `Makefile`. Each target
calls an npm script (`release-notes:*` in root `package.json`) that calls the node script, matching
the existing make → npm → script pattern.

```bash
make release_notes_target
make release_notes_new APP=mobile
make release_notes_new ALL=1
make release_notes_add APP=mobile TEXT="Queue syncs between devices"
make release_notes_check
make release_notes_check RELEASE=5.5.3
make release_notes_compose VERSION=5.5.3 FORMAT=github
make release_notes_compose VERSION=5.5.3 FORMAT=play
make release_notes_freeze VERSION=5.5.3
```

`release_notes_stamp_staging` and carry-forward have no Make target; only the publish scripts run
them.

## Tests

`release-notes.test.mjs` (`node --test`) builds a temp git repo with a config and tags, then covers:

- target version with and without an existing formal tag, and with a prerelease in package.json
- `add` refuses a frozen file; `new` is idempotent
- `check` errors on a frozen-file edit in a range, oversize store block, bad front matter
- coverage warning when a watched path changes without notes; silence for ignored paths
- `stamp-staging` numbering and the no-op case
- `carry-forward` moves lines and deletes the old draft
- `freeze` output passes `check --release`; refuses without a TTY
- `compose` github/play output for a fixture version

Add `npm run release-notes:test` and include the suite in root `test:unit` if it fits the
`run-workspaces` runner; otherwise keep it as a separate root script listed in the final verify.

## Done when

- All scripts exist with `--help`, and the operator-only ones refuse a non-TTY stdin.
- Make targets work from repo root.
- `SCRIPTS-RELEASE-NOTES.md` documents each script and the agent/operator split.
