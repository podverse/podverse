# Git / work tree targets (included from root Makefile).
# Run from repository root.

.PHONY: start_feature_worktree

# Interactive: creates a new branch in a new work tree, links env overrides, runs local_env_setup,
# and creates the LLM history file so you can start working immediately.
start_feature_worktree:
	bash scripts/start-feature-worktree.sh
