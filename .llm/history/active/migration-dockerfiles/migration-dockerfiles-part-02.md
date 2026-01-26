# Feature: migration-dockerfiles (Part 2)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.

## Metadata
- Started: 2026-01-25
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude
- GitHub Issues: https://github.com/podverse/podverse/issues/1
- Branch: feature/migration-dockerfiles
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Optimize Docker builds to reduce image size and build times by:
1. Adding a `.dockerignore` to exclude unnecessary files from build context
2. Converting single-stage Dockerfiles to multi-stage builds so final images only contain runtime artifacts

*Continued from migration-dockerfiles-part-01.md (Sessions 1-10)*

## Sessions

### Session 11 - 2026-01-26

#### Prompt (Developer)
Apps are missing "start" commands to run in Docker containers

#### Problem
The docker-compose files use `npm start` command, but `api` and `management-api` package.json files were missing `start` scripts.

#### Key Decisions
- Added `"start": "node ./dist/index.js"` to `apps/api/package.json`
- Added `"start": "node ./dist/index.js"` to `apps/management-api/package.json`
- This matches the pattern already used by `apps/workers/package.json`

#### Files Changed
- `apps/api/package.json` (added start script)
- `apps/management-api/package.json` (added start script)

### Session 12 - 2026-01-26

#### Prompt (Developer)
User noticed Session 11 exceeded the 10-session limit rule

#### Problem
The history file had 11 sessions but the `llm-history-tracking.mdc` rule specifies a **10-session maximum** per file.

#### Key Decisions
- Renamed `migration-dockerfiles.md` to `migration-dockerfiles-part-01.md` (sessions 1-10)
- Created `migration-dockerfiles-part-02.md` for sessions 11+ (this file)
- Added cross-reference notes between part files

#### Files Changed
- `.llm/history/active/migration-dockerfiles/migration-dockerfiles.md` → `migration-dockerfiles-part-01.md` (renamed)
- `.llm/history/active/migration-dockerfiles/migration-dockerfiles-part-02.md` (created)

### Session 13 - 2026-01-26

#### Prompt (Developer)
Suggestion: start-feature script should always add `-part-01` to the filename when generating placeholder history files

#### Key Decisions
- Updated `scripts/start-feature.sh` to create history files with `-part-01.md` suffix by default
- Added comment explaining the 10-session limit rule reference
- Updated generated file header to include "(Part 1)" in the title
- Added inline reminder about the 10-session limit and how to create Part 2
- This makes the naming convention clear from the start and simplifies following the rule

#### Files Changed
- `scripts/start-feature.sh` (updated to use `-part-01` suffix and add 10-session limit reminder)

### Session 14 - 2026-01-26

#### Prompt (Developer)
Need a command to stop containers, delete images, and rebuild for testing

#### Key Decisions
- Added `local_rebuild_all_apps` target to Makefile.local
- Combines `local_stop_all_apps`, `local_prune_podverse_images`, and `local_build_all` into one command
- Provides convenience for the common rebuild workflow during development

#### Files Changed
- `Makefile.local` (added local_rebuild_all_apps target)

### Session 15 - 2026-01-26

#### Prompt (Developer)
Docker build cache causing stale package.json to be used even after image prune

#### Problem
After running `local_rebuild_all_apps`, containers still showed "Missing script: start" error even though `package.json` had the start script. Docker's build cache retained old layers.

#### Key Decisions
- Updated `local_prune_podverse_images` to also run `docker builder prune -f`
- This clears the Docker build cache in addition to removing images
- Ensures truly fresh builds when rebuilding after code changes

#### Files Changed
- `Makefile.local` (added `docker builder prune -f` to local_prune_podverse_images)

### Session 16 - 2026-01-26

#### Prompt (Developer)
All 4 Docker app containers failing to start after rebuild

#### Problem
- API and management-api: `npm error Missing script: "start"` - docker-compose was overriding Dockerfile CMD with `command: npm start`, which looked for start script in root package.json (not the app's)
- Web and management-web: `Error: Cannot find module '/opt/app/server.js'` - Next.js monorepo standalone output preserves directory structure, putting server.js at nested path

#### Root Cause Analysis
1. **API apps**: The Dockerfiles have correct CMD (`node apps/api/dist/index.js`) but docker-compose overrode it with `npm start`
2. **Web apps**: Without `outputFileTracingRoot`, Next.js standalone creates `apps/web/server.js` inside the standalone folder instead of `server.js` at root

#### Key Decisions
- Removed `command: npm start` from `infra/docker/local/api/docker-compose.yml`
- Removed `command: npm start` from `infra/docker/local/management-api/docker-compose.yml`
- Added `outputFileTracingRoot: path.join(__dirname, '../../')` to `apps/web/next.config.ts`
- Added `outputFileTracingRoot: path.join(__dirname, '../../')` to `apps/management-web/next.config.ts`
- Removed `command: sh -c "node server.js"` from web docker-compose files
- Let Dockerfiles be the single source of truth for startup commands

#### Files Changed
- `infra/docker/local/api/docker-compose.yml` (removed command override)
- `infra/docker/local/management-api/docker-compose.yml` (removed command override)
- `infra/docker/local/web/docker-compose.yml` (removed command override)
- `infra/docker/local/management-web/docker-compose.yml` (removed command override)
- `apps/web/next.config.ts` (added outputFileTracingRoot for monorepo standalone)
- `apps/management-web/next.config.ts` (added outputFileTracingRoot for monorepo standalone)

---

## Related Resources

- [Link to PR]
- [Link to related issues]
