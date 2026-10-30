---
name: git-worktree-sibling
description: Create and use Podverse git worktrees in sibling directories named podverse_<branch_slug> (underscores). Use when starting feature work, moving WIP off the main checkout, opening the correct worktree path for a branch, or giving the commands that start a plan set (abcplan, plan-runner) in a fresh worktree.
---

# Git worktree — sibling directories

## When to use

- Starting or continuing work on a **feature branch** without leaving `podverse` on `develop`.
- Moving in-progress changes out of the primary checkout into a dedicated directory.
- Telling the agent **which folder** to edit for a given branch.

## Layout

| Role                                 | Path                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| Primary checkout (stay on `develop`) | `/Users/mitcheldowney/repos/pv/podverse`                |
| Parent of all worktrees              | `/Users/mitcheldowney/repos/pv/`                        |
| Feature worktree                     | `/Users/mitcheldowney/repos/pv/podverse_<branch_slug>/` |

Worktrees are **siblings** of `podverse`, not subdirectories inside it.

## Directory naming (canonical)

```text
podverse_<branch_slug>
```

Derive `<branch_slug>` from the git branch name:

1. Replace every `/` with `_`
2. Replace every `-` with `_`

Examples:

| Branch                       | Worktree directory                  |
| ---------------------------- | ----------------------------------- |
| `feature/tracking-consent`   | `podverse_feature_tracking_consent` |
| `feature/page-navigation-ux` | `podverse_page_navigation_ux`       |
| `chore/typeorm-v1`           | `podverse_chore_typeorm_v1`         |
| `llm/cursor-hooks`           | `podverse_llm_cursor_hooks`         |

Older worktrees may use hyphens (e.g. `podverse-typeorm-v1`); **prefer the underscore form** for new worktrees.

## Create a worktree

Run from the primary repo. The branch must **not** be checked out in `podverse`.

```bash
cd /Users/mitcheldowney/repos/pv/podverse

# ensure primary checkout is on develop (or another base branch)
git checkout develop

git worktree add ../podverse_feature_tracking_consent feature/tracking-consent
```

Create a new branch at the same time, allow its `.envrc`, and open it in its own Cursor window:

```bash
git worktree add -b feature/my-feature ../podverse_feature_my_feature develop
direnv allow ../podverse_feature_my_feature
cursor --new-window ../podverse_feature_my_feature
```

Then, in the **Root** tab of the new window:

```bash
make local_env_worktree_setup
npm run deps:init
```

`direnv allow` runs from the creating window because a pasted block runs as one command line in
fish: allowing inside the new window's first paste would not load the Nix shell for the lines
after it. The new window's first prompt builds the worktree's direnv cache, which can take a
moment.

## Plan sets in a worktree

Every plan set runs in its own worktree on its own branch, one set per worktree and one PR per
set. The worktree is opened in its own Cursor window, so the chat that answers a stopped run
(**abcresume**), and any fix made by hand, works in that worktree. A chat in another window reads
the other checkout's `.artifacts/plan-runner/` and edits the other checkout's files.

The plan-runner run itself does not depend on the window: `run.sh` changes to its own checkout,
and every agent starts there. A run started from another window's terminal is already in the
right worktree; open the worktree's window for the chat, and keep the starting window open, since
closing it ends its terminal and the run.

### How an agent gives the commands

Lead the commands with a bold **Fresh worktree required** line that names the set and says why.
Then give two blocks, in this order.

**Block 1 — Root tab of the current window.** Create every worktree the reply calls for, allow
each `.envrc`, and open each in a new window. When the set is not committed on the base (a
`00-REQUEST.md` or plan set this chat just wrote), move that one folder into the worktree. Nothing
else crosses over, so a dirty checkout with unrelated work stays as it is.

```bash
git worktree add -b feature/<slug> ../podverse_feature_<slug_underscored> develop
mkdir -p ../podverse_feature_<slug_underscored>/.llm/plans/active
mv .llm/plans/active/<slug> ../podverse_feature_<slug_underscored>/.llm/plans/active/
direnv allow ../podverse_feature_<slug_underscored>
cursor --new-window ../podverse_feature_<slug_underscored>
```

Leave out the `mkdir` and `mv` lines when the set is already committed on the base.

**Block 2 — Root tab of the worktree's window**, one block per worktree, each naming its window:

```bash
make local_env_worktree_setup
npm run deps:init
./scripts/abcplan/run.sh plan <slug>
```

Use `run <slug>` instead of `plan <slug>` when the set is already planned. A plain plan set uses
`node ../plan-runner/run-plan-set.mjs <slug>`.

### Base and scope

- The base is `develop` unless the work needs committed but unmerged commits; then name that
  branch. Work that needs uncommitted changes from another checkout waits until they are
  committed, and the reply says so.
- When a request splits into sets that could ship separately and share no files, recommend one
  worktree per set and give all of block 1 before any block 2.

### Across parallel worktrees

- Every set that adds a linear migration sees the same last number. The set that merges second
  rebases, renumbers its migration, moves the readiness marker, and runs
  `make db_regen_linear_baseline` and `make db_verify_linear_baseline`. Mobile SQLite migration
  versions follow the same rule. Never hand-merge the `.sql.gz` baselines.
- Unit tests, type-check, and lint run in any worktree at any time. API integration, web E2E, and
  Maestro share fixed ports, containers, test databases, and simulators, so they run in one
  worktree at a time, after rebasing on `develop`.
- Merge in dependency order and rebase the open worktrees after each merge.

## Move WIP from primary checkout into a worktree

When `podverse` already has the feature branch checked out with local changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git stash push -u -m "feature-name wip"
git checkout develop
git worktree add ../podverse_feature_tracking_consent feature/tracking-consent
cd ../podverse_feature_tracking_consent
make local_env_worktree_setup
git stash pop
```

Use `git stash push -u` so **untracked** files (e.g. `.llm/plans/active/...`) move with the stash.

## Daily workflow

- **Edit feature code** in the sibling worktree (`podverse_feature_*`), not in `podverse` unless intentionally on `develop`.
- **Commands** still run from that worktree’s root (same as monorepo root): `./scripts/nix/with-env npm run lint`, `make e2e_test_web_report_spec`, etc.
- **First-time env in a worktree:** `make local_env_worktree_setup` (links home overrides, applies persisted DB/MQ/Valkey secrets, syncs Postgres passwords when the container is running).
- **Open in Cursor** as its own window (`cursor --new-window <dir>`), one window per worktree.

List worktrees:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git worktree list
```

## Remove a worktree

When the operator asks to remove worktrees, the commands run from the primary checkout
(`podverse`) on `develop`. That checkout is the repo root, and it can remove every merged
sibling in one paste, including a merge worktree whose branch is already in `develop`. A
checkout cannot remove itself, so do not give the paste for a feature or merge worktree.

`git pull` on `develop` first when that checkout is behind `origin/develop`. `git branch -d`
refuses a branch that is not in the current tip. Omit `develop`, omit any worktree the operator
did not ask to remove, and omit remote deletes. `git worktree remove` stops when the directory
still has untracked or modified files; say what `--force` would discard before adding it.

```bash
cd /Users/mitcheldowney/repos/pv/podverse
git pull
git worktree remove ../podverse_feature_tracking_consent
git worktree prune
git branch -d feature/tracking-consent
```

## Agent rules

1. Before editing files, confirm **which worktree** matches the user’s branch (`git worktree list` or ask).
2. Do **not** implement feature work on `podverse` while it is on `develop` if a sibling worktree exists for that branch.
3. When the user names a branch (e.g. `feature/tracking-consent`), resolve the directory as `podverse_feature_tracking_consent` under `repos/pv/`.
4. Plans for deferred work live under `.llm/plans/active/` in the **worktree** that owns the feature branch.
5. Worktree removal commands are for the primary checkout on `develop`. See **Remove a worktree**.

## Related

- **abcplan** and **abcresume** — plan sets and stopped runs, both from the worktree's window
- **abcbranchesmerge** — a new `feature/merge-YYYY-MM-DD` worktree off `develop`; the run
  pushes only that branch, and the agent does not remove the worktree
- **mobile-worktree-scope** — which mobile tracks can run in parallel worktrees
- Contributor LLM overview: [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](/docs/development/llm/DOCS-DEVELOPMENT-LLM.md)
- Nix wrapper (run from worktree root): [nix-terminal-wrapper](/.cursor/rules/nix-terminal-wrapper.mdc) skill / `.cursor/rules/nix-terminal-wrapper.mdc`
