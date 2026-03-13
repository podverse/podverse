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
