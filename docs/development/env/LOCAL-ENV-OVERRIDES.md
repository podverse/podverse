# Local Env Overrides (Home Directory)

Use a single set of override files in your home directory and symlink them into each clone or work
tree so you do not have to re-enter secrets or preferences when creating new work trees. The
canonical place for override values is `~/.config/podverse/local-env-overrides/` (or
`PODVERSE_HOME_OVERRIDES_DIR`).

## Recommended flow (one consistent process)

1. **Prepare** — Create initial override files in the home directory from examples:

   ```bash
   make local_env_prepare
   ```

   This ensures files exist in `~/.config/podverse/local-env-overrides/` by copying each missing
   file from `dev/env-overrides/local/*.env.example`. For files that already exist, it **appends**
   any keys present in the example but missing from your home copy (defaults from the example line;
   existing `KEY=` lines are never overwritten). It does not create any files in the repo.

2. **Edit** — Fill in your private or external values (API keys, encryption key, etc.) in the
   files under that home directory. **`local-secrets.env`** is filled automatically on the first
   `make local_env_setup` (migrated from existing `infra/config/local/db.env` when present, or
   generated once and persisted to home).

3. **Link** — Make the repo use those files:

   ```bash
   make local_env_link
   ```

   This creates symlinks in `dev/env-overrides/local/*.env` pointing to the home directory. The
   repo now sees your override values when setup or apps read them.

4. **Setup** — Generate app and infra env files from the overrides:

   ```bash
   make local_env_setup
   ```

5. **Start infrastructure and create DB users** — Start containers and create the app and
   management Postgres users so credentials match the database:

   ```bash
   make local_infra_up
   make local_db_init
   ```

`local_db_init` creates/updates these roles in Postgres:
`podverse_app_read`, `podverse_app_read_write`,
`podverse_management_read`, and `podverse_management_read_write`.
Passwords come from `infra/config/local/db.env` (main + management DB credentials in one file).
Without it, apps fail with "password authentication failed" for the configured DB user.

Alternatively, you can run **`make local_setup`** once (after prepare, edit, and link): it
runs `local_env_setup`, `local_infra_up`, and `local_db_init` in order, so you do not need
to run steps 4 and 5 separately.

You can skip step 1 and run `make local_env_link` first; link will create the home files from
examples when they are missing. Then edit the home directory and run `make local_env_setup`.

## Why

- Git work trees and separate clones do not share untracked or ignored files.
- `dev/env-overrides/local/*.env` are gitignored, so each new work tree has no override files.
- Re-running `make local_env_prepare` does **not** replace your home override files wholesale; it
  creates missing files from examples and merges **missing** keys from examples into existing files.

By keeping the real override files in a directory under your home and symlinking
`dev/env-overrides/local/*.env` to that directory, every work tree (and the main repo) uses the
same overrides.

### Existing installs (seed home secrets from primary checkout)

If you already had a working **`podverse`** checkout before this flow, run **once from that
primary checkout** (the one whose Postgres you use):

```bash
make local_env_export_secrets_to_home
```

That copies DB/MQ/Valkey/JWT passwords from `infra/config/local/*.env` into
`~/.config/podverse/local-env-overrides/local-secrets.env`. After that, new work trees use
`make local_env_worktree_setup` and share the same credentials.

## Default location

Override files live in:

- **Default**: `~/.config/podverse/local-env-overrides/`
- **Override**: set `PODVERSE_HOME_OVERRIDES_DIR` to a different path (e.g.
  `$HOME/.podverse/overrides`).

## One-time setup (summary)

Follow the [recommended flow](#recommended-flow-one-consistent-process) above: `make local_env_prepare`, edit the home directory files, `make local_env_link`, `make local_env_setup`, then `make local_infra_up` and `make local_db_init` (or run `make local_setup` to do env setup, infra up, and DB init in one go). After that, the same home directory is used by this repo and any other clone or work tree where you run `make local_env_link`.

## New work tree or clone

1. Clone or create the work tree and `cd` into it.

2. Run:

   ```bash
   make local_env_worktree_setup
   ```

   This links home overrides, generates app/infra env from **`local-secrets.env`** in
   `~/.config/podverse/local-env-overrides/` (same DB/MQ/Valkey/JWT passwords on every checkout),
   and syncs Postgres role passwords when `podverse_local_db` is already running.

   Equivalent manual steps:

   ```bash
   make local_env_link
   make local_env_setup
   make local_env_sync_db_passwords
   ```

   No need to re-enter override values or copy env files from the main checkout.

3. Start Docker infrastructure (env setup does **not** start containers):

   ```bash
   make local_infra_up
   npm run check:dev-deps
   ```

   First time on a machine or after `local_all_down` removed volumes: `make local_setup` or
   `make local_db_init` once Postgres is up.

4. Continue with the rest of setup (e.g. `npm run build:packages`, `npm run dev:all:watch`).

## Start a feature in a new work tree (one command)

To create a new branch in a new work tree and have env overrides and local env files ready in one
step, run from your main clone (or any existing work tree):

```bash
make start_feature_worktree
```

This interactive command uses the same prompts as `npm run start-feature` (feature type, short name,
optional issue numbers), then:

- Creates a new work tree and branch (e.g. `feature/add-chapters` from `develop`)
- Runs `make local_env_worktree_setup` in the new work tree (link overrides, apply home-persisted
  secrets, sync Postgres passwords when the local DB container is running)
- Runs `direnv allow` in the work tree (if direnv is installed) so the first terminal there loads
  the Nix flake
- Runs `npm install` in the work tree (via Nix when available) so `node_modules` is ready
- Creates the LLM history file in the new work tree

Optional: set `PODVERSE_NIX_DEV_SHELL` (e.g. `.#fish`) so the Nix shell used for `npm install`
matches your preferred interactive shell. Example: `PODVERSE_NIX_DEV_SHELL=.#fish make start_feature_worktree`.

You can then `cd` into the new work tree and start working immediately. See
[QUICKSTART.md](/docs/QUICKSTART.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## In-repo overrides (no home directory)

If you prefer not to use the home directory at all (single clone only):

- Manually copy `dev/env-overrides/local/*.env.example` to `dev/env-overrides/local/*.env` (e.g.
  `cp mailer.env.example mailer.env`).
- Edit those files in the repo.
- Run `make local_env_setup`.

In each new work tree you will need to copy and edit again. For work trees or multiple clones,
use the [recommended flow](#recommended-flow-one-consistent-process) with prepare and link so
overrides live in ~/.config and are shared.

## Custom home directory path

Set `PODVERSE_HOME_OVERRIDES_DIR` before running `make local_env_prepare` or `make local_env_link`:

```bash
export PODVERSE_HOME_OVERRIDES_DIR="$HOME/.podverse/overrides"
make local_env_link
```

Use the same value in every work tree so all of them point at the same directory.

## Behavior details

- **Prepare**: `make local_env_prepare` creates initial override files in the home directory
  (`~/.config/podverse/local-env-overrides/` or `PODVERSE_HOME_OVERRIDES_DIR`) from
  `dev/env-overrides/local/*.env.example`. It only creates files that are missing; it does not
  write into the repo. Use the same `PODVERSE_HOME_OVERRIDES_DIR` for both prepare and link.
- **Link (idempotent)**: Running `make local_env_link` again does not overwrite existing
  `dev/env-overrides/local/*.env` files. If a file already exists (as a regular file or symlink),
  it is left unchanged.
- **Link (bootstrap)**: If a file is missing in the home directory, link creates it by copying the
  corresponding `*.env.example` from the repo (or the repo’s real override file when present). So
  you can run link first without running prepare.
- **Sync from repo once**: If the home file already exists but was filled from example (e.g.
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is empty) and the repo has a real override file with
  values, link copies the repo file into the home directory and replaces the repo file with a
  symlink to home. That way existing repo values move into ~/.config once; after that, edit only
  the home directory.
- **Symlink target**: Scripts use the absolute path for the home directory so symlinks work
  regardless of the current working directory.

## Override files and which apps they affect

When you run `make local_env_setup`, each override file in `dev/env-overrides/local/*.env` is
sourced, then specific variables are written into app and infra env files. Main apps (API,
Workers, Web) and management apps (Management API, Management Web, Management DB) receive
different subsets.

| Override file            | Apps / env files that receive its values                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| add-by-rss.env           | API + Workers (ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| app.env                  | API + Workers + Management API (LOG_DIR); API (ACCOUNT_SIGNUP_MODE); Web (NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE from ACCOUNT_SIGNUP_MODE).                                                                                                                                                                                                                                                                                                                                                                                   |
| brand.env                | api/workers = `BRAND_NAME`; API = `BRAND_COLOR_PRIMARY`, `BRAND_BANNER_IMAGE_3X1_URL`; web/mgmt = `MANAGEMENT_BRAND_NAME`, `BRAND_DOMAIN`, optional logos, `BRAND_*` / `NEXT_PUBLIC_BRAND_*` app + document chrome (icons, theme, background). Set **`BRAND_BACKGROUND_COLOR`**; `local_env_setup` maps it to `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR` in sidecars. If `NEXT_PUBLIC_BRAND_THEME_COLOR` is omitted, `local_env_setup` sets it from `BRAND_COLOR_PRIMARY`. Do not set `NEXT_PUBLIC_BRAND_NAME` in overrides. |
| legal.env                | API only: `LEGAL_NAME`, `LEGAL_ADDRESS` (`config.legal`)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| lightning.env            | Web only (Lightning LNAddress / node app-value vars)                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| mailer.env               | API (MAILER_HOST, MAILER_PORT, MAILER_USERNAME, MAILER_PASSWORD, MAILER_FROM)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| metaboost.env            | Web (`NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD`, `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE`); API (`METABOOST_SIGNING_KEY_PEM`, `METABOOST_APP_ASSERTION_ISS`)                                                                                                                                                                                                                                                                                                                                                             |
| locale.env               | Web + Management Web (app, infra, sidecars): NEXT*PUBLIC_FEATURES*\* from DEFAULT_LOCALE, SUPPORTED_LOCALES. Single source; do not set locale in other override files.                                                                                                                                                                                                                                                                                                                                                 |
| theme.env                | Web + Management Web sidecars: `NEXT_PUBLIC_DEFAULT_THEME` and `NEXT_PUBLIC_SUPPORTED_THEMES` from `DEFAULT_UI_THEME` and `SUPPORTED_UI_THEMES` (see `dev/env-overrides/local/theme.env.example`). Single source for UI theme allowlist and default, like `locale.env` for locales.                                                                                                                                                                                                                                    |
| web-image.env            | Web sidecars only: optional **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`** and **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** (`dev/env-overrides/local/web-image.env.example`).                                                                                                                                                                                                                                                                                                                                             |
| management-superuser.env | Local DB env (`infra/config/local/db.env`) for management superuser bootstrap                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| notifications.env        | Workers; Web gets NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| paypal.env               | API (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| podcast-index.env        | API + Workers (PODCAST_INDEX_AUTH_KEY, PODCAST_INDEX_SECRET_KEY; not auto-generated—only from this override).                                                                                                                                                                                                                                                                                                                                                                                                          |
| local-secrets.env        | **Home-persisted** auto-generated infra secrets: all `DB_*_PASSWORD` keys, `ARTEMIS_PASSWORD`, `KEYVALDB_PASSWORD`, `AUTH_JWT_SECRET_API`, `AUTH_JWT_SECRET_MANAGEMENT`. `local_env_setup` reads these first so every work tree uses the same passwords as the shared Docker Postgres/MQ/Valkey. New secrets are written to home once; existing home values are never overwritten. See `dev/env-overrides/local/local-secrets.env.example`.                                                                          |
| socials.env              | API (email template social links); Web (contact + social)                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| storage.env              | Workers + Management API: `BUCKET_*` merged into app and infra env for workers and management-api (same contract as `dev/env-overrides/local/storage.env.example`, including `BUCKET_ENDPOINT` and `BUCKET_FORCE_PATH_STYLE` for garage / s3-compatible). Management Web does not receive bucket vars here.                                                                                                                                                                                                            |

Management API receives bucket vars from `storage.env` for the management object-storage browser; it does not receive mailer, PayPal, legal, socials, notifications, podcast-index, or lightning overrides. Management Web does not receive those overrides either (except where sidecars receive merged web-facing keys documented above).

### Web and Management Web env file split

`make local_env_setup` writes only `RUNTIME_CONFIG_URL` into `apps/web/.env.local` and
`apps/management-web/.env.local` (used by the Next.js app when you run `npm run dev:web` or
`npm run dev:management-web`). All other web/management-web runtime values (brand, locale, UI theme, PWA/favicon, VAPID, etc.) are
written to both infra sidecar env files
(`infra/config/local/web-sidecar.env`, `infra/config/local/management-web-sidecar.env`) and
app sidecar `.env` files (`apps/web/sidecar/.env`, `apps/management-web/sidecar/.env`). App-level
env files (including sidecar `.env`) use **localhost** only and are for `npm run dev`; files under
`infra/config/local/` use Docker container hostnames for Compose.

## See also

- [QUICKSTART.md](/docs/QUICKSTART.md) – Full local setup and “Clean start” flow.
- [CONTRIBUTING.md](CONTRIBUTING.md) – Workflow and `make start_feature_worktree`.
- `make start_feature_worktree` – Create a new branch in a new work tree with env and history ready.
- `make local_env_clean` – Removes generated env files but keeps `dev/env-overrides/local/*.env`
  (and thus your symlinks) intact.
