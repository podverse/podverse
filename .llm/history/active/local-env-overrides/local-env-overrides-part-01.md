# Local env overrides (home directory)

- **Started**: 2025-03-13
- **Context**: Home-directory env overrides for work trees; symlink overrides so multiple clones/work trees share one set of override files.

---

### Session 1 - 2025-03-13

#### Prompt (Developer)

Home-directory local env overrides for work trees. Implement the plan as specified.

#### Key Decisions

- Default home path: `~/.config/podverse/local-env-overrides/`; override via `PODVERSE_HOME_OVERRIDES_DIR`.
- New script `scripts/local-env/link-overrides.sh`: bootstrap home dir from examples, symlink only when repo file missing (idempotent).
- New Make target `local_env_link`; no automatic dependency from `local_env_setup`.
- Doc: `docs/development/LOCAL-ENV-OVERRIDES.md`; QUICKSTART updated with work-tree bullet.

#### Files Created/Modified

- `scripts/local-env/link-overrides.sh` (new)
- `makefiles/local/Makefile.local.env.mk` (added `local_env_link` target and .PHONY)
- `docs/development/LOCAL-ENV-OVERRIDES.md` (new)
- `docs/QUICKSTART.md` (work trees / home-dir overrides subsection in step 2)

---

### Session 2 - 2025-03-13

#### Prompt (Developer)

write a make command called start_feature_worktree that handles all the steps needed to create a new branch in a worktree. it should flow through mostly the same start-feature logic but the end result is a new branch in a worktree that has properly symlinked env vars so the work can be begun immediately. the command may need to go in a new git focused make file if an appropriate make file does not already exist. mention this make command in documentation

#### Key Decisions

- New script `scripts/start-feature-worktree.sh`: same interactive prompts as start-feature.sh (type, name, issues), then work tree path (default ../podverse-<branch-sanitized>), base branch (default develop); runs `git worktree add`, then in new work tree runs `make local_env_link` and `make local_env_setup`, then creates LLM history file there.
- New makefile `makefiles/git/Makefile.git.mk` with `start_feature_worktree` target; included from root Makefile.
- Documented in LOCAL-ENV-OVERRIDES.md (new section), QUICKSTART.md (work trees bullet), CONTRIBUTING.md (Starting a Feature), and See also in LOCAL-ENV-OVERRIDES.

#### Files Created/Modified

- `scripts/start-feature-worktree.sh` (new)
- `makefiles/git/Makefile.git.mk` (new)
- `Makefile` (include Makefile.git.mk)
- `docs/development/LOCAL-ENV-OVERRIDES.md` (section + See also)
- `docs/QUICKSTART.md` (start_feature_worktree mention)
- `docs/development/CONTRIBUTING.md` (start_feature_worktree subsection)

---

### Session 3 - 2025-03-13

#### Prompt (Developer)

User ran `make start_feature_worktree` then `npm run dev:all` in the work tree; API failed with ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY missing (key is in main repo dev/env-overrides/local/private-services.env), and management-api failed with password authentication for user "read". Identify fixes so work tree gets same env and DB credentials as main.

#### Key Decisions

- **link-overrides.sh**: When bootstrapping home (home file missing), if the repo has a real (non-symlink) override file for that name, copy that to home instead of the example so main repo's secrets populate home; work trees then symlink to home and get the same values.
- **start-feature-worktree.sh**: (1) Run `local_env_link` in REPO_ROOT before creating the work tree so home is populated from main's real overrides. (2) After creating work tree, run `local_env_link` in work tree (symlinks only). (3) Copy from main repo into work tree: infra/config/local/\*.env, apps/api/.env, apps/workers/.env, apps/management-api/.env, apps/web/.env.local, apps/management-web/.env.local (only when they exist in main) so DB credentials match. (4) Skip `local_env_setup` in work tree when any env file was copied; otherwise run it.

#### Files Created/Modified

- `scripts/local-env/link-overrides.sh` (bootstrap home from repo real override when present)
- `scripts/start-feature-worktree.sh` (link in main first, copy main env files to work tree, conditional local_env_setup)

---

### Session 4 - 2025-03-13

#### Prompt (Developer)

Single source of truth for env overrides. Implement the plan as specified.

#### Key Decisions

- **link-overrides.sh**: Added `get_var` helper; when home file exists but `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY` is empty in home and repo has a real `private-services.env` with that key set, copy repo → home and replace repo file with symlink to home (one-time sync from repo).
- **LOCAL-ENV-OVERRIDES.md**: Added "Which to use?" (link vs prepare), clarified link = ~/.config canonical / prepare = repo canonical; expanded One-time setup step 2 with "sync from repo once" and step 3 with "single source of truth"; added Behavior details bullet "Sync from repo once"; tightened In-repo overrides to say repo is single source of truth and to prefer link for work trees.

#### Files Created/Modified

- `scripts/local-env/link-overrides.sh` (get_var helper, sync repo→home for private-services.env when home looks like example, then symlink repo→home)
- `docs/development/LOCAL-ENV-OVERRIDES.md` (Which to use?, sync-from-repo note, behavior details, in-repo wording)

---

### Session 5 - 2025-03-13

#### Prompt (Developer)

i am thinking that local_env_prepare should create the initial .env files in the ~/.config path, and then the dev fills them out, and then after those are filled out, then local_env_link can be used so the env vars are available to be used in the repo, and then local_env_setup can work

#### Key Decisions

- **prepare-overrides.sh**: Now creates initial override files in the home directory (~/.config/podverse/local-env-overrides/ or PODVERSE_HOME_OVERRIDES_DIR) from dev/env-overrides/local/\*.env.example; does not create any files in the repo. Same path logic as link. Message tells user to edit then run local_env_link and local_env_setup.
- **LOCAL-ENV-OVERRIDES.md**: Reframed around one consistent process: (1) prepare creates files in ~/.config, (2) dev edits them, (3) link symlinks repo to ~/.config, (4) setup generates app/infra env. One-time setup shortened; in-repo overrides now described as manual copy + edit + setup (no prepare in repo). Behavior details updated to describe prepare creating in home; custom path note includes prepare.

#### Files Created/Modified

- `scripts/local-env/prepare-overrides.sh` (write to home overrides dir only, same path as link)
- `docs/development/LOCAL-ENV-OVERRIDES.md` (recommended flow prepare → edit → link → setup; one-time setup summary; in-repo as manual; behavior + custom path)

---

### Session 6 - 2025-03-13

#### Prompt (Developer)

Local env and read/read_write password alignment. Implement the plan as specified.

#### Key Decisions

- Root cause: prepare → link → setup → local_infra_up skips local_db_init, so Postgres read/read_write users are never created; apps fail with "password authentication failed for user read". Fix: document that after local_infra_up (or after env-overrides flow) user must run make local_db_init, or use make local_setup.
- **LOCAL-ENV-OVERRIDES.md**: Added step 5 (Start infrastructure and create DB users: make local_infra_up, make local_db_init), note on local_db_init creating roles, alternative make local_setup. Updated One-time setup summary to include infra up + db_init.
- **Makefile.local.infra.mk**: After local_infra_up recipe, added echo reminding to run make local_db_init.
- **QUICKSTART.md**: In step 3 note, added sentence that if user ran local_env_setup and local_infra_up separately, run make local_db_init before starting apps.
- **CONTRIBUTING.md**: In start_feature_worktree paragraph, added sentence that after local_env_setup user must run make local_infra_up then make local_db_init, or make local_setup.

#### Files Created/Modified

- `docs/development/LOCAL-ENV-OVERRIDES.md` (step 5, one-time setup summary)
- `makefiles/local/Makefile.local.infra.mk` (reminder echo after local_infra_up)
- `docs/QUICKSTART.md` (note on local_db_init when using separate setup + infra_up)
- `docs/development/CONTRIBUTING.md` (note on local_infra_up + local_db_init or local_setup)
