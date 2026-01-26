# Feature: migration-dockerfiles

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

## Sessions

### Session 1 - 2026-01-25

#### Prompt (Developer)
Review the docker files in this podverse repo. They should have only the files needed in them in order to work. We don't want any extraneous files in them.

#### Key Decisions
- Created root `.dockerignore` to exclude `node_modules/`, `dist/`, `.git/`, documentation, infrastructure files, IDE configs, test files, and other build artifacts from Docker context
- Converted `apps/api/Dockerfile` from single-stage to multi-stage build with deps → builder → runner stages
- Converted `apps/workers/Dockerfile` from single-stage to multi-stage build
- Converted `apps/management-api/Dockerfile` from single-stage to multi-stage build
- Final runner stages only copy `dist/` directories and `package.json` files needed for runtime
- Use `npm install --workspaces --omit=dev` in runner stage to exclude devDependencies
- The `apps/web/Dockerfile` and `apps/management-web/Dockerfile` were already using multi-stage builds correctly

#### Files Changed
- `.dockerignore` (created)
- `apps/api/Dockerfile` (converted to multi-stage)
- `apps/workers/Dockerfile` (converted to multi-stage)
- `apps/management-api/Dockerfile` (converted to multi-stage)

### Session 2 - 2026-01-25

#### Prompt (Developer)
01-makefile-targets

#### Key Decisions
- Added Docker build targets to `Makefile.local` for all apps (api, workers, management-api, web, management-web)
- Added `local_build_all` target to build all images at once
- Added `local_test_docker_builds` target to verify image optimization (checks for absence of src files and presence of dist files)
- Added docker-compose test targets (`local_test_api`, `local_test_workers`, `local_test_management_api`) for testing built images
- Targets follow existing Makefile.local patterns and naming conventions

#### Files Changed
- `Makefile.local` (added Docker build and test targets)

### Session 3 - 2026-01-25

#### Prompt (Developer)
proceed

#### Key Decisions
- Added Docker sections to documentation files with build and testing instructions
- Updated `docs/QUICKSTART.md` with comprehensive Docker Images section including building, testing, verification, and optimization details
- Updated root `README.md` with brief Docker section linking to detailed docs
- Updated `apps/api/README.md` and `apps/workers/README.md` with Docker sections
- All documentation follows existing formatting and style conventions

#### Files Changed
- `docs/QUICKSTART.md` (added Docker Images section)
- `README.md` (added Docker section)
- `apps/api/README.md` (added Docker section)
- `apps/workers/README.md` (added Docker section)

### Session 4 - 2026-01-26

#### Prompt (Developer)
@Docker (702-766) - Docker build error with prepare script

#### Problem
Docker builds were failing with error: `bash: scripts/git-hooks/install-hooks.sh: No such file or directory`

#### Root Cause
- `.dockerignore` excludes `scripts/` directory (intentionally, as it's not needed in Docker)
- `package.json` has a `prepare` script that runs during `npm install` and tries to execute `scripts/git-hooks/install-hooks.sh`
- The prepare script fails because the `scripts/` directory doesn't exist in the Docker build context

#### Key Decisions
- Added `--ignore-scripts` flag to all `npm install` commands in Dockerfiles to skip lifecycle scripts
- Git hooks installation is not needed in Docker containers, so skipping the prepare script is safe
- Applied fix to both deps stage and runner stage install commands in all three Dockerfiles (api, workers, management-api)

#### Files Changed
- `apps/api/Dockerfile` (added `--ignore-scripts` to both install commands)
- `apps/workers/Dockerfile` (added `--ignore-scripts` to both install commands)
- `apps/management-api/Dockerfile` (added `--ignore-scripts` to both install commands)

### Session 5 - 2026-01-26

#### Prompt (Developer)
@Docker (766-828) - eslint not found during build

#### Problem
Docker builds were failing with error: `sh: 1: eslint: not found` when trying to build packages. The build scripts run `npm run lint` which requires `eslint`, but it wasn't available even though it's in root `package.json` devDependencies.

#### Root Cause
- Using `npm install --workspaces --ignore-scripts` was not installing root devDependencies properly
- `eslint` is in root `package.json` devDependencies and is needed for package build scripts
- The `--workspaces` flag might have been causing root devDependencies to be skipped or not hoisted correctly

#### Key Decisions
- Changed from `npm install --workspaces --ignore-scripts` to `npm install --ignore-scripts` in deps stage
- `npm install` (without `--workspaces`) still installs all workspace dependencies (defined in package.json workspaces) but also ensures root devDependencies are installed
- This ensures `eslint` and other root devDependencies are available for build scripts
- Runner stage still uses `--workspaces --omit=dev` which is correct for production (no devDependencies needed)

#### Files Changed
- `apps/api/Dockerfile` (changed deps stage install from `--workspaces` to standard `npm install`)
- `apps/workers/Dockerfile` (changed deps stage install from `--workspaces` to standard `npm install`)
- `apps/management-api/Dockerfile` (changed deps stage install from `--workspaces` to standard `npm install`)

### Session 6 - 2026-01-26

#### Prompt (Developer)
@Docker (828-903) - eslint.config.mjs not found during build

#### Problem
Docker builds were failing with error: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`
The eslint config file exists at repo root but wasn't being copied into the Docker image.

#### Root Cause
- The Dockerfile only copied `package*.json` and `packages/` but not `eslint.config.mjs`
- ESLint 9.x requires a config file (no longer uses `.eslintrc.*` files by default)
- Packages also extend `tsconfig.base.json` which also wasn't being copied

#### Key Decisions
- Added `COPY eslint.config.mjs tsconfig.base.json ./` to copy both config files into Docker
- These are needed for the build process (linting and TypeScript compilation)
- Both files are small and don't affect final image size (they're in builder stage, not runner stage)

#### Files Changed
- `apps/api/Dockerfile` (added COPY for eslint.config.mjs and tsconfig.base.json)
- `apps/workers/Dockerfile` (added COPY for eslint.config.mjs and tsconfig.base.json)
- `apps/management-api/Dockerfile` (added COPY for eslint.config.mjs and tsconfig.base.json)

### Session 7 - 2026-01-26

#### Prompt (Developer)
the docker files should not have eslint in them or anything you wouldn't expect in an actual deployment

#### Problem
Docker builds were including eslint and devDependencies, which aren't needed for deployment. Linting should happen in CI, not during Docker builds.

#### Key Decisions
- Added `build:prod` scripts to all packages that just run `tsc` without linting
- Added `build:packages:prod` to root package.json
- Added `build:prod` to `apps/workers/package.json`
- Updated all Dockerfiles to:
  - Use `npm install --omit=dev --ignore-scripts` (no devDependencies)
  - Use `build:packages:prod` instead of `build:packages`
  - Use `build:prod` instead of `build` for app builds
  - Remove `eslint.config.mjs` from COPY (only keep `tsconfig.base.json` for TypeScript)
- This makes Docker builds faster and images smaller (no eslint, no devDependencies)
- Linting is now only done in CI and local development, not in Docker builds

#### Files Changed
- `package.json` (added `build:packages:prod` script)
- `packages/helpers/package.json` (added `build:prod` script)
- `packages/external-services/package.json` (added `build:prod` script)
- `packages/orm/package.json` (added `build:prod` script)
- `packages/notifications/package.json` (added `build:prod` script)
- `packages/parser/package.json` (added `build:prod` script)
- `packages/mq/package.json` (added `build:prod` script)
- `apps/workers/package.json` (added `build:prod` script)
- `apps/api/Dockerfile` (use prod builds, remove eslint, omit devDependencies)
- `apps/workers/Dockerfile` (use prod builds, remove eslint, omit devDependencies)
- `apps/management-api/Dockerfile` (use prod builds, remove eslint, omit devDependencies)

### Session 8 - 2026-01-26

#### Prompt (Developer)
@Docker (920-972) - Missing @types/he for TypeScript compilation

#### Problem
Docker builds failed with TypeScript error: `Could not find a declaration file for module 'he'`
The `@types/he` package is a devDependency needed for TypeScript compilation.

#### Root Cause
Using `npm install --omit=dev` skipped devDependencies including `@types/*` packages, but type definitions are required for TypeScript compilation in the build stage.

#### Key Decisions
- Changed deps stage from `npm install --omit=dev --ignore-scripts` to `npm install --ignore-scripts`
- devDependencies (especially `@types/*` packages) are needed during the build stage for TypeScript
- The runner stage still uses `--omit=dev` which is correct (only runtime dependencies needed)
- This doesn't include eslint in the build - eslint is a root devDependency, and we're not running lint scripts

#### Files Changed
- `apps/api/Dockerfile` (remove --omit=dev from deps stage)
- `apps/workers/Dockerfile` (remove --omit=dev from deps stage)
- `apps/management-api/Dockerfile` (remove --omit=dev from deps stage)

### Session 9 - 2026-01-26

#### Prompt (Developer)
proceed with option 1 (test the fix with `make local_build_all`)

#### Problem 1 - Unused @ts-expect-error directives in API source code
Build failed with TypeScript errors: `Unused '@ts-expect-error' directive` in several API controllers.
The Docker build environment with all devDependencies correctly identified that these directives were no longer needed.

#### Root Cause
The `@ts-expect-error` directives were added to suppress TypeScript errors that no longer exist (likely because type definitions were updated). TypeScript 5.x is stricter about unused error-suppression comments.

#### Key Decisions
- Removed all unused `@ts-expect-error` directives from affected files
- The directives were suppressing errors that no longer occur with current types

#### Files Changed
- `apps/api/src/controllers/account/account.ts` (removed unused @ts-expect-error on line 182)
- `apps/api/src/controllers/clip.ts` (removed unused @ts-expect-error on lines 330, 477, 479, 513, 515)
- `apps/api/src/controllers/item.ts` (removed unused @ts-expect-error on lines 332, 705, 708, 720)

#### Problem 2 - Web and management-web Dockerfiles missing fixes
The `apps/web/Dockerfile` and `apps/management-web/Dockerfile` still had the old configuration without `--ignore-scripts` and `build:packages:prod`.

#### Key Decisions
- Updated both Dockerfiles with the same fixes applied to other apps:
  - Added `tsconfig.base.json` to COPY for TypeScript compilation
  - Added `--ignore-scripts` to `npm install` to skip git hooks install script
  - Changed `npm run build:packages` to `npm run build:packages:prod` (TypeScript only, no linting)
- Web apps use `next build` directly (no `build:prod` script needed as Next.js handles optimization)

#### Files Changed
- `apps/web/Dockerfile` (added --ignore-scripts, use build:packages:prod, add tsconfig.base.json)
- `apps/management-web/Dockerfile` (added --ignore-scripts, use build:packages:prod, add tsconfig.base.json)

#### Verification
All 5 Docker images built successfully:
- podverse-api: 419MB
- podverse-management-api: 414MB
- podverse-management-web: 330MB
- podverse-web: 353MB
- podverse-workers: 416MB

### Session 10 - 2026-01-26

#### Prompt (Developer)
Add missing Makefile targets for web apps, plus a command to run all apps together

#### Key Decisions
- Added `local_test_web` target to run web app container at http://localhost:3000
- Added `local_test_management_web` target to run management web at http://localhost:3999
- Added `local_test_all_apps` target to start api, web, management-api, and management-web together
- Added `local_stop_all_apps` target to stop all app containers at once
- These complement the existing `local_test_api` and `local_test_management_api` targets

#### Files Changed
- `Makefile.local` (added local_test_web, local_test_management_web, local_test_all_apps, local_stop_all_apps)

---

## Related Resources

- [Link to PR]
- [Link to related issues]

*Continued in migration-dockerfiles-part-02.md*
