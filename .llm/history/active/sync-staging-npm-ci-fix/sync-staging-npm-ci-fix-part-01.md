# sync-staging npm ci fix

Started: 2026-04-29
Author: Agent
Context: Fix malformed package-lock entries and workspace version drift so sync-develop-to-staging.sh passes npm ci.

---

### Session 1 - 2026-04-29

#### Prompt (Developer)

Why `sync-develop-to-staging.sh` failed

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Aligned all workspace `package.json` versions to 5.4.19 to match root (5.4.19 bump had only updated root + lockfile).
- Regenerated `package-lock.json` via `update-lockfile-linux.sh` after changing Docker step to `find … node_modules` prune-delete before `npm install`, eliminating incomplete nested `@types/node` stubs that broke `npm ci`.
- Added `jq` + non-empty workspace guard to `bump-version.sh` so `npm query .workspace` cannot silently yield zero workspaces.

#### Files Created/Modified

- `.llm/history/active/sync-staging-npm-ci-fix/sync-staging-npm-ci-fix-part-01.md`
- `apps/**/package.json`, `packages/**/package.json`, `tools/**/package.json` (version 5.4.19)
- `package-lock.json`
- `scripts/development/update-lockfile-linux.sh`
- `scripts/publish/bump-version.sh`
- `tools/web-perf/bundle-analyzer/package-lock.json`

_Sync script note: `sync-develop-to-staging.sh` requires local `develop` to match `origin/develop`; after this commit, push `develop` first, then run the sync script._
