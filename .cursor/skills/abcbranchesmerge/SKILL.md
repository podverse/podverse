---
name: abcbranchesmerge
description: Merge named branches into a new feature/merge-YYYY-MM-DD branch in a planned order, then lint, type-check, push that branch only, and run abcsmoketest. Use when the operator runs /abcbranchesmerge or says abcbranchesmerge with one or more branches.
---

# `abcbranchesmerge`

**abcbranchesmerge** `<branch> [<branch> ...]` merges each named branch into a new branch the
agent names. The operator does not name that branch. Feature, bugfix, and any other branch
type use the same steps. The branch type does not change the order.

The new branch is `feature/merge-YYYY-MM-DD`, using today's date. It is created from
`develop`. If that branch or its worktree already exists, append `-2`, then `-3`, and so on.

The invoking chat writes the plan and does not merge. It gives the **git-worktree-sibling**
two-block commands, the same shape as **abcplan**. Plan-runner executes the set in the new
worktree: one fresh agent per step, one step at a time. Smoke steps follow **abcsmoketest**.

## What this command allows

Invoking this command is the explicit request to merge the named branches into the new
`feature/merge-…` branch and to commit and push **that branch only**.
**operator-only-git-operations** still blocks every other git write.

Allowed, on the merge branch only, after `git status` shows that branch and no other:

- `git merge --no-ff` of each named branch, then the merge commit Git prepared (`git commit
--no-edit` after a conflict resolution)
- A follow-up commit for lint, type-check, or smoke fixes
- `git push -u origin HEAD` the first time, then `git push` with no refspec. No force.

Forbidden, even during this command:

- Any push, merge, or commit onto a branch other than the merge branch. `develop`, `main`,
  and `staging` are never the destination.
- Deleting a branch, local or remote (`git branch -d`, `git push --delete`)
- Removing or pruning a worktree
- Force push, tags, releases, and pull requests
- `git merge -X ours`, `git merge -X theirs`, squash, or rebase

The last step tells the operator it is done and gives cleanup commands. It does not run them.

## When the operator invokes it

1. Require at least one branch. If none was given, ask.
1. Pick the merge branch name (§ above). Record it in the plan. Do not ask the operator to
   name it.
1. Fetch. A dirty tree (anything other than the plan files this command is about to write)
   stops the run. Ask the operator to commit or stash. Do not stash.
1. Resolve each named branch to a tip: the local branch if it exists, otherwise
   `origin/<branch>`. If neither exists, stop and list the missing names. Do not guess a
   similar name.
1. Write the plan (§ Order, § Plan files). Order is computed against `develop`, which is the
   tip the new branch starts at. Do not merge in this chat.
1. Reply with **Fresh worktree required**, then the two blocks from **git-worktree-sibling**
   § Plan sets in a worktree. Block 1 creates `feature/merge-…` from `develop`, moves only
   this set's folder, allows `.envrc`, and opens the window. Block 2 sets up the worktree and
   runs the set.

Worktree directory: `podverse_feature_merge_YYYY_MM_DD` (each `/` and `-` in the branch name
becomes `_`). `<slug>` is the branch name lowercased, with each `/` and `_` turned into `-`.
The set directory is `.llm/plans/active/branches-merge-<slug>/`.

Tell the operator, briefly:

- First time on a computer: `npm --prefix ../plan-runner install`, then
  `node ../plan-runner/run-plan-set.mjs --login`.
- In **Mobile E2E Metro**, leave `npm run mobile:dev:e2e` running before block 2. The iOS
  smoke step exits until port 8081 is that E2E bundle.
- When a step stops with a question, answer by continuing that same agent:
  `./scripts/abcbranchesmerge/run.sh <slug> --resume 'Your answer.'`
  `/abcresume` prints that command. Ask in a chat of the worktree's window.
- Branches and worktrees are left in place. Cleanup commands arrive in the last step's message,
  after the push. Those commands never delete `develop` or the merge branch's remote.

**Block 1 — Root** tab of the current window:

```bash
git worktree add -b feature/merge-YYYY-MM-DD ../podverse_feature_merge_YYYY_MM_DD develop
mkdir -p ../podverse_feature_merge_YYYY_MM_DD/.llm/plans/active
mv .llm/plans/active/branches-merge-<slug> ../podverse_feature_merge_YYYY_MM_DD/.llm/plans/active/
direnv allow ../podverse_feature_merge_YYYY_MM_DD
cursor --new-window ../podverse_feature_merge_YYYY_MM_DD
```

**Block 2 — Root** tab of the worktree's window:

```bash
make local_env_worktree_setup
npm run deps:init
./scripts/abcbranchesmerge/run.sh <slug>
```

## Order

Write the reason for the order into `00-ORDER.md`. Compute it against `develop`. Do not sort
by branch type.

1. Skip a branch whose tip is already an ancestor of `develop`. List it as already merged.
1. For each remaining branch, record commits ahead of `develop` (`git rev-list --count`),
   files touched (`git diff --name-only`), and whether `git merge-tree` predicts a conflict.
1. Clean merges first, fewer files first, then fewer commits.
1. Predicted conflicts after that. Branches that touch the same paths sit next to each other,
   smaller one first, so the next merge sees the resolution.

Each merge uses `git merge --no-ff` so the branch stays visible when it could have
fast-forwarded.

## Plan files

Under `.llm/plans/active/branches-merge-<slug>/`:

- `00-ORDER.md` — the merge branch name, each named branch's real name and tip, skips, the
  order, and the counts that produced it. State that the only branch to push is the merge
  branch.
- `NN-merge-<branch-slug>.md` — one file per branch that will merge. The branch to merge, the
  predicted conflict paths, and "resolve per **abcbranchesmerge** § Conflicts".
- `COPY-PASTA.md` — one `##` heading per step so the steps cannot run together. Model lines stay
  outside the fence (**copy-pasta-recommend-model**). Each fence starts with `Read and execute
.llm/plans/active/branches-merge-<slug>/<NN-plan>.md`.

Steps, in order:

1. One step per branch. Cursor Grok 4.7. Reasoning **high** when `git merge-tree` is clean,
   **extra high** when it predicts a conflict. Confirm HEAD is the merge branch. Merge that
   named branch only, resolve, and commit the merge. Do not push.
1. Lint and types. Cursor Grok 4.7, **high**. From the repo root, with the Nix shell loaded:
   `npm run lint:fix`, then `npm run lint`, then `npm run type-check`. Fix what the skill
   allows, commit when the tree changed, then push the merge branch (§ What this command
   allows). Refuse the push when HEAD is any other branch.
1. One step per **abcsmoketest** § Order tier, each saying to follow **abcsmoketest** § Runner
   steps for that tier only. Cursor Grok 4.7, **high**. These steps may edit code to fix a
   failure. They do not commit or push.
1. Last step. Cursor Grok 4.7, **medium**. § Done.

A step that must stop reports `RUNNER-STATUS: BLOCKED — <question>` and includes the options
and what each option changes. Later steps do not start.

## Conflicts

Resolve a conflict in the same step that hit it.

Resolve without asking when both sides can stay, or the conflict is mechanical: imports,
formatting, a generated lockfile (regenerate it; do not hand-merge hunks), or two additions
that do not change the same behavior.

Stop and ask when both sides change the same behavior and either reading is plausible, when
two migrations want the same number or the choice could drop or duplicate data, or when
keeping one side would remove the other branch's change. Show both sides, the files, and what
each choice changes. Do not pick a side to get unblocked.

## Lint and types

After `lint:fix`, fix remaining lint and type errors that are mechanical (an unused import, a
type the merge made wrong, a missing export). Stop and ask when the fix needs a product
decision or would change behavior past what the merged branches already did.

## Smoke

Smoke is **abcsmoketest**, unchanged. A clear failure is fixed in that tier's step, the tier
is rerun, and the result is recorded. An unclear failure is deferred the way **abcsmoketest**
defers it, and the step stops. Do not describe a tier as passed unless the rerun passed.

## Done

The last step:

- Confirms HEAD is the merge branch. Commits uncommitted smoke or lint fixes, with a one-line
  message, and pushes that branch when the lint step's push did not already include them.
  Skips the commit when the tree is clean. Does not push any other branch.
- Moves the set to `.llm/plans/completed/branches-merge-<slug>/` after that push.
- Tells the operator every named branch is merged and `feature/merge-…` is pushed, or names
  what is still blocked or deferred. A deferred smoke failure means the merge branch is pushed
  and the smoke is not done.
- Gives cleanup commands for the operator to run later, from the primary checkout on
  `develop` (**git-worktree-sibling** § Remove a worktree). One paste removes every merged
  source worktree and the merge worktree. A checkout cannot remove itself, so the paste is
  not for the merge worktree. Then `git worktree prune`, then `git branch -d` for each of
  those branches. Omit `develop` and any unrelated worktree. Omit remote deletes. The
  commands are fish-safe, in one `bash` fence. Do not run them.

```bash
git worktree remove ../podverse_feature_example
git worktree prune
git branch -d feature/example
```
