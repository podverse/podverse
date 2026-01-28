# Future Work & Backlog

**Status**: Reference document for deferred tasks

Items noted during planning that should be addressed after core migration is complete.

---

## High Priority (Address During or Shortly After Migration)

### Makefile Commands Migration

**Context**: `podverse-ops` uses Makefiles for convenience commands.

**Current files**:

- `Makefile.local` - local development
- `Makefile.alpha` - alpha deployment
- `Makefile.certs` - certificate management
- `Makefile.sandbox` - sandbox environment
- `Makefile.test` - test commands

**Task**: Create root `Makefile` in monorepo with equivalent commands:

```makefile
local_db_up:
	docker compose -f infra/docker/local/docker-compose.yml up -d podverse_local_db

local_mq_up:
	docker compose -f infra/docker/local/docker-compose.yml up -d podverse_local_mq

local_keyvaldb_up:
	docker compose -f infra/docker/local/docker-compose.yml up -d podverse_local_keyvaldb
```

**When**: Phase 4 or Phase 6

---

### Docker Build Contexts

**Context**: Dockerfiles use `COPY` commands that need updated paths in monorepo.

**Example change needed**:

```dockerfile
# Before (standalone repo)
COPY package*.json ./
COPY src ./src

# After (monorepo)
COPY apps/api/package*.json ./
COPY apps/api/src ./src
# May also need workspace packages
COPY packages/helpers/dist ./node_modules/@podverse/helpers/dist
```

**Task**: Update all Dockerfiles during Phase 3 app migration.

**Consideration**: May need multi-stage builds or workspace-aware Docker strategy.

**When**: Phase 3 (App Migration)

---

### Valkey/KeyvalDB Local Setup

**Context**: KeyvalDB (Valkey/Redis) is required for API and Workers.

**Current**: `make local_keyvaldb_up` in podverse-ops

**Task**: Ensure Docker Compose includes KeyvalDB service in `infra/docker/local/`.

**When**: Phase 4

---

## Medium Priority (Post-Migration Improvements)

### Workers Job Configuration

**Context**: Workers has multiple job types with different configurations.

**Current jobs** (from podverse-workers):

- RSS feed parsing
- Notification sending
- Stats aggregation
- Cleanup tasks

**Task**: Document per-job configuration and consider per-job env var strategy.

**When**: Post-migration (noted in master plan as future work)

---

### Testing Strategy

**Context**: No comprehensive testing plan yet.

**Scope**:

- Unit tests (Jest)
- Integration tests (API endpoints)
- E2E tests (web flows)
- Shared test utilities in `tools/qa`

**Task**: Create testing plan document covering:

- Test runner configuration
- Coverage thresholds
- CI integration
- Shared fixtures and mocks

**When**: Post-migration

---

### TypeORM Migration Generation

**Context**: Phase 9 covers applying migrations, but not generating them.

**Current workflow**:

1. Modify entity in `packages/orm`
2. Run TypeORM CLI to generate migration
3. Move migration to `infra/database/migrations/`

**Task**: Document migration generation workflow for monorepo:

```bash
npm run typeorm -- migration:generate -d packages/orm/src/data-source.ts
```

**When**: Phase 9 or post-migration

---

### Beta/Production Deployment

**Context**: Plans focus on alpha deployment. Beta and production follow similar patterns but aren't detailed.

**Task**: After alpha workflow is proven, document:

- Beta deployment trigger (alpha → beta branch merge)
- Production deployment trigger (beta → main branch merge)
- Additional approvals/checks for production

**When**: After 2+ successful alpha deployments

---

## Low Priority (Nice to Have)

### Secrets Management Documentation

**Context**: GitHub Actions secrets, npm tokens, Docker registry tokens mentioned but not centrally documented.

**Required secrets**:

- `NPM_TOKEN` - npm publish
- `GHCR_REGISTRY_TOKEN` - Docker image queries
- `GITHUB_TOKEN` - automatic
- Jenkins credentials for deployment

**Task**: Create `docs/SECRETS.md` documenting all required secrets and how to configure them.

**When**: Phase 5 or post-migration

---

### Monitoring & Logging

**Context**: No centralized approach to logging across monorepo.

**Current**: Each app has its own logging setup.

**Task**: Consider:

- Shared logging configuration from `@podverse/helpers`
- Log aggregation strategy
- Error tracking (Sentry or similar)

**When**: Post-migration (not blocking)

---

### i18n File Migration

**Context**: Web apps have internationalization files.

**Files**:

- `podverse-web/i18n/` - translation files
- `podverse-management-web/i18n/` - admin translations

**Task**: Ensure i18n files are properly copied during Phase 3.

**When**: Phase 3 (should happen naturally, noting here as reminder)

---

### Selective CI Builds

**Context**: Currently builds everything on every PR.

**Optimization**: Only build/test affected packages based on changed files.

**Approach options**:

- GitHub Actions path filters
- Nx/Turborepo (if added later)
- Custom script to detect changes

**When**: After migration, if CI becomes slow

---

## Reference: Master Plan Future Work

From `00-master-plan.md`:

1. Split helpers into focused modules (`@podverse/types`, `@podverse/core`, etc.)
2. Split external-services per integration (`@podverse/firebase`, `@podverse/paypal`)
3. Per-job env vars for workers
4. Selective CI builds (only affected packages)
5. Testing strategy (unit, integration, e2e)

---

## Tracking

| Item                  | Priority | Addressed In   | Status  |
| --------------------- | -------- | -------------- | ------- |
| Makefile commands     | High     | Phase 4/6      | Pending |
| Docker build contexts | High     | Phase 3        | Pending |
| Valkey setup          | High     | Phase 4        | Pending |
| Workers job config    | Medium   | Post-migration | Pending |
| Testing strategy      | Medium   | Post-migration | Pending |
| TypeORM migration gen | Medium   | Phase 9        | Pending |
| Beta/prod deployment  | Medium   | Post-alpha     | Pending |
| Secrets documentation | Low      | Phase 5        | Pending |
| Monitoring/logging    | Low      | Post-migration | Pending |
| i18n migration        | Low      | Phase 3        | Pending |
| Selective CI          | Low      | Post-migration | Pending |
