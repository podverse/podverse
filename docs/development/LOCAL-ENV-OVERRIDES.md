# Local Env Overrides (Home Directory)

Use a single set of override files in your home directory and symlink them into each clone or work
tree so you do not have to re-enter secrets or preferences when creating new work trees.

## Why

- Git work trees and separate clones do not share untracked or ignored files.
- `dev/env-overrides/local/*.env` are gitignored, so each new work tree has no override files.
- Re-running `make local_env_prepare` only creates fresh copies from examples, forcing you to
  re-enter values everywhere.

By keeping the real override files in a directory under your home and symlinking
`dev/env-overrides/local/*.env` to that directory, every work tree (and the main repo) uses the
same overrides.

## Default location

Override files live in:

- **Default**: `~/.config/podverse/local-env-overrides/`
- **Override**: set `PODVERSE_HOME_OVERRIDES_DIR` to a different path (e.g.
  `$HOME/.podverse/overrides`).

## One-time setup

1. From the Podverse repo root, run:

   ```bash
   make local_env_link
   ```

2. This creates `~/.config/podverse/local-env-overrides/` (or your override path), copies any
   missing `*.env` files from the repo’s `dev/env-overrides/local/*.env.example`, and creates
   symlinks in `dev/env-overrides/local/*.env` pointing to those home files.

3. Edit the files under the home directory with your private or external values (API keys, brand
   name, etc.).

4. Run:

   ```bash
   make local_env_setup
   ```

After this, the same home directory is used by this repo and any other clone or work tree where you
run `make local_env_link`.

## New work tree or clone

1. Clone or create the work tree and `cd` into it.

2. Run:

   ```bash
   make local_env_link
   make local_env_setup
   ```

   No need to re-enter override values; the symlinks point to your existing home directory files.

3. Continue with the rest of setup (e.g. `make local_setup`, `npm run build:packages`).

## Start a feature in a new work tree (one command)

To create a new branch in a new work tree and have env overrides and local env files ready in one
step, run from your main clone (or any existing work tree):

```bash
make start_feature_worktree
```

This interactive command uses the same prompts as `npm run start-feature` (feature type, short name,
optional issue numbers), then:

- Creates a new work tree and branch (e.g. `feature/add-chapters` from `develop`)
- Runs `make local_env_link` and `make local_env_setup` in the new work tree so overrides are
  symlinked and runtime env files are generated
- Creates the LLM history file in the new work tree

You can then `cd` into the new work tree and start working immediately. See
[QUICKSTART.md](../QUICKSTART.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## In-repo overrides (no home directory)

If you prefer to keep overrides only inside the repo (no symlinks):

- Use `make local_env_prepare` to create `dev/env-overrides/local/*.env` from examples.
- Edit those files in the repo.
- Run `make local_env_setup`.

In each new work tree you will need to run `local_env_prepare` again and re-enter or copy your
values.

## Custom home directory path

Set `PODVERSE_HOME_OVERRIDES_DIR` before running `make local_env_link`:

```bash
export PODVERSE_HOME_OVERRIDES_DIR="$HOME/.podverse/overrides"
make local_env_link
```

Use the same value in every work tree so all of them point at the same directory.

## Behavior details

- **Idempotent**: Running `make local_env_link` again does not overwrite existing
  `dev/env-overrides/local/*.env` files. If a file already exists (as a regular file or symlink),
  it is left unchanged.
- **Bootstrap**: If a file is missing in the home directory, it is created by copying the
  corresponding `*.env.example` from the repo.
- **Symlink target**: Scripts use the absolute path for the home directory so symlinks work
  regardless of the current working directory.

## See also

- [QUICKSTART.md](../QUICKSTART.md) – Full local setup and “Clean start” flow.
- [CONTRIBUTING.md](CONTRIBUTING.md) – Workflow and `make start_feature_worktree`.
- `make start_feature_worktree` – Create a new branch in a new work tree with env and history ready.
- `make local_env_clean` – Removes generated env files but keeps `dev/env-overrides/local/*.env`
  (and thus your symlinks) intact.
