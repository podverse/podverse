# sync-staging-docker-audit

**Started:** 2026-05-06  
**Author:** Cursor Agent  
**Context:** Run `npm ci` + audit for promote-to-staging inside Linux Docker (matches CI) to avoid EBADPLATFORM on macOS with linux-canonical lockfile.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Why `sync-develop-to-staging.sh` failed after `bump-version.sh`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced host `npm ci` + `check-audit-gate.sh` with a single `docker run` using `node:24`, `npm ci --include=optional` (aligned with `.github/workflows/ci.yml`), and the same audit gate script inside the container.
- Reused `LOCKFILE_DOCKER_PLATFORM` (default `linux/amd64`) and documented Apple Silicon note consistent with `update-lockfile-linux.sh`.
- Added optional `SYNC_STAGING_NODE_IMAGE` override for the Node image tag.
- After success, warn that `node_modules` on the bind mount reflects Linux installs so macOS dev may need a reinstall.

#### Files Created/Modified

- `scripts/publish/sync-develop-to-staging.sh`
- `.llm/history/active/sync-staging-docker-audit/sync-staging-docker-audit-part-01.md`
