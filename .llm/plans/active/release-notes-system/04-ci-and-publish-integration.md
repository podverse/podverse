# 04 — CI and publish integration

## Goal

Wire the scripts from 02 into CI and the operator release train, so a release cannot reach `main`
without frozen notes and the GitHub release and store text come from those files.

Agents edit the scripts and workflows here. The operator runs them. Do not run any publish script.

## CI: `.github/workflows/ci.yml`

New job `release-notes` on pull requests:

```bash
node scripts/release-notes/check.mjs --range "origin/${{ github.base_ref }}...HEAD" --hook ci
```

- Fetch depth must include the base branch and tags (`fetch-depth: 0`).
- Errors fail the job. Coverage warnings are annotations only.
- PR label `no-release-notes` passes `--no-coverage`. Add the label to the PR labeler config so it
  exists in the repo.

## `scripts/publish/bump-version.sh`

After the new version is chosen and before the bump commit:

- If the previous version's files are drafts and no formal tag exists for it, run
  `carry-forward --from <old> --to <new>` (it confirms via TTY).
- Otherwise run `new --all` for the new version.
- Include the release-notes changes in the same bump commit.

## `scripts/publish/sync-develop-to-staging.sh`

Before fast-forwarding `staging`:

1. `git fetch --tags`.
2. Run `stamp-staging` (TTY confirm). If it changed files, commit them on `develop` as
   `docs(release-notes): stamp X.Y.Z-staging.N` and push `develop` with `--no-verify`, the same
   bypass `bump-version.sh` uses. Skip when it was a no-op.
3. Continue with the existing fast-forward.

Depends on open question 4 in `00-SUMMARY.md`. If the operator chose no per-staging stamping, skip
this change and leave lines under `### Unreleased` until freeze.

## `.github/workflows/publish-staging.yml`

After the version reservation step, warn (do not fail) when the reserved `X.Y.Z-staging.N` differs
from the newest stamped heading in any notes file, so a mismatch is visible in the run summary.

## `scripts/publish/sync-staging-to-main.sh`

Before the fast-forward, run `check --release X.Y.Z` (X.Y.Z from root `package.json`, suffix
stripped). Refuse with the freeze command when any app is missing or not frozen.

## `.github/workflows/publish-main.yml`

In `create-release`, replace the placeholder body:

```javascript
const body = execSync(`node scripts/release-notes/compose.mjs --version ${base} --format github`)
  .toString();
```

Fall back to the current placeholder with a `core.warning` when the compose script fails, so a
notes problem never blocks image promotion that already happened. Also append the composed body to
`$GITHUB_STEP_SUMMARY`.

## `scripts/mobile/eas-android.sh`

EAS cannot set Play release notes. In `submit`:

- Print `compose --version <target> --format play` before the confirmation prompt so the operator
  sees what to paste into Play Console.
- After success, repeat the block with "Paste into Play Console → Internal testing → Release
  notes".
- Warn, not fail, when the mobile notes file has no Store block yet.

## Operator runbook

Update `scripts/publish/README.md` "Typical flow" and `docs/development/release/RELEASE-NOTES.md`
with the order:

```bash
./scripts/publish/bump-version.sh
./scripts/publish/sync-develop-to-staging.sh
make release_notes_check
make release_notes_freeze VERSION=X.Y.Z
./scripts/publish/sync-develop-to-staging.sh
./scripts/publish/preflight-rtm-promote.sh
./scripts/publish/sync-staging-to-main.sh
make release_notes_compose VERSION=X.Y.Z FORMAT=play
```

Explain each line in prose around the block:

- After the version bump, agents add notes during normal work; repeat the staging sync as often as
  needed.
- Before freezing, paste `.cursor/prompts/release-notes-finalize.md` with the version into an
  agent on a `release/X.Y.Z-notes` branch, review the result, merge it to `develop`.
- `release_notes_freeze` runs on a branch too; commit and merge it before the final staging sync.
- The last command prints the store text for Play and App Store Connect.

## Docs

- `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`: where store notes come from.
- `docs/development/release/STAGING-MAIN-PROMOTION.md`: the frozen-notes gate.
- `docs/billing/BILLING-GOOGLE-PLAY-SANDBOX.md`: the submit step now prints release notes.

## Done when

- CI job, bump, staging sync, main sync, publish-main body, and EAS submit changes are in place.
- Every changed shell script still passes `bash -n` and keeps its existing behavior when the notes
  are valid.
- The runbook lists the operator commands in order.
