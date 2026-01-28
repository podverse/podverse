# Feature: migration-alpha-publishing (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `migration-alpha-publishing-part-02.md`.

## Metadata

- Started: 2026-01-26
- Completed: 2026-01-26
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/2
- Branch: feature/migration-alpha-publishing
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Evaluate and finalize the alpha deployment process for the monorepo. Key goals:

1. Determine if npm package publishing is still needed (or if packages can be built from source in Docker)
2. Establish version update and vulnerability scanning workflows
3. Handle protected branch constraints with GitHub App automation
4. Consider manual trigger options for deployments

## Sessions

### Session 1 - 2026-01-26

#### Prompt (Developer)

Now that the docker files appear to be working, assess the current state of the alpha deployment setup. The alpha branch exists as a convention for triggering GitHub Actions to publish Docker images. Questions:

- Do we still need to publish npm packages to npm registry since they're tightly coupled in the monorepo?
- How to handle version updates and npm vulnerability scans? (Reference old podverse-ops scripts)
- How to handle the protected develop branch? Use a GitHub App?
- Can we use buttons or other triggers in GitHub?

#### Key Decisions

- **npm packages NOT needed for Docker builds**: The Dockerfiles copy packages from the monorepo and build from source (`COPY packages/` and `npm run build:packages:prod`). No npm registry pull required.
- **Simplification opportunity**: Remove npm publishing step from `publish-alpha.yml`, making the workflow simpler and faster
- **GitHub App pattern exists**: `complete-feature.yml` and `i18n.yml` already use a GitHub App to push to protected `develop` branch. This pattern can be reused.
- **Vulnerability scanning**: `scripts/audit/audit.sh` exists for monorepo, and Renovate/Dependabot are configured for automated alerts

#### Files Reviewed (Assessment)

- `.github/workflows/publish-alpha.yml` - current alpha workflow with npm publishing
- `.github/workflows/complete-feature.yml` - GitHub App pattern for protected branches
- `.github/workflows/ci.yml` - comment-triggered CI
- `.github/dependabot.yml` - automated dependency updates
- `renovate.json` - alternative dependency automation
- `scripts/publish/bump-version.sh` - version bumping
- `scripts/audit/audit.sh` - vulnerability scanning
- `apps/api/Dockerfile`, `apps/web/Dockerfile` - confirm packages built from source
- `podverse-ops/scripts/publish/alpha-publish-all-packages.sh` - old multi-repo publish
- `podverse-ops/scripts/publish/v5-develop-update-version-all.sh` - old version update
- `docs/BRANCH-PROTECTION.md` - branch protection rules
- `docs/modules/SECRETS.md` - required secrets

---

### Session 2 - 2026-01-26

#### Prompt (Developer)

Implement the alpha deployment simplification plan:

1. Remove npm publish job from publish-alpha.yml, add workflow_dispatch trigger
2. Create docs/ALPHA-DEPLOYMENT.md with testing instructions
3. Update SECRETS.md to note NPM_TOKEN no longer required

#### Key Decisions

- Removed entire `publish-packages` job from publish-alpha.yml (packages built from source in Docker)
- Added `workflow_dispatch` trigger with optional `version_override` input
- Created comprehensive ALPHA-DEPLOYMENT.md with local testing, release flow, and troubleshooting
- Updated SECRETS.md with "Legacy Secrets" section explaining why NPM_TOKEN is no longer needed

#### Files Changed

- `.github/workflows/publish-alpha.yml` - simplified workflow
- `docs/ALPHA-DEPLOYMENT.md` - new deployment guide
- `docs/modules/SECRETS.md` - updated secrets documentation

---

### Session 3 - 2026-01-26

#### Prompt (Developer)

Restore the incrementing version logic for Docker tags. The Jenkins deployment uses `getLatestAlphaTag.sh` which expects `X.Y.Z-alpha.N` format (e.g., `5.2.0-alpha.0`, `5.2.0-alpha.1`).

#### Key Decisions

- Restored `GHCR_REGISTRY_TOKEN` usage to query existing Docker tags
- Version calculation now happens per-app in `publish-docker` job (since each app has its own tag history)
- Format: `5.2.0-alpha.0`, `5.2.0-alpha.1`, etc. (auto-incrementing)
- Keeps `alpha` rolling tag for convenience
- Maintains compatibility with existing Jenkins deployment pipelines

#### Files Changed

- `.github/workflows/publish-alpha.yml` - restored incrementing version logic
- `docs/modules/SECRETS.md` - restored GHCR_REGISTRY_TOKEN as required secret
- `docs/ALPHA-DEPLOYMENT.md` - updated prerequisites

---

### Session 4 - 2026-01-26

#### Prompt (Developer)

Review the alpha workflow for issues. Found missing setup-node in publish-docker job.

#### Key Decisions

- Added `setup-node` step to `publish-docker` job to ensure Node.js v22 is available for version calculation
- Without this, the `node -p "require('./package.json').version"` command could fail or use wrong Node version

#### Files Changed

- `.github/workflows/publish-alpha.yml` - added setup-node step

---

### Session 5 - 2026-01-26

#### Prompt (Developer)

Add a make command for pre-push validation so there's one easy command to run before merging to alpha.

#### Key Decisions

- Added `make validate` - runs audit, lint, type-check, build:packages, build:apps
- Added `make validate_docker` - runs validate + builds all 5 Docker images locally
- Updated ALPHA-DEPLOYMENT.md to reference these commands

#### Files Changed

- `Makefile` - added validate and validate_docker targets
- `docs/ALPHA-DEPLOYMENT.md` - updated testing section

---

## Related Resources

- [GitHub Issue](https://github.com/podverse/podverse/issues/2)
- [Branch: feature/migration-alpha-publishing](https://github.com/podverse/podverse/tree/feature/migration-alpha-publishing)
