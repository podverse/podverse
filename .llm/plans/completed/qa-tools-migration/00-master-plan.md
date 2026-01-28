# QA Performance Tools Migration - Master Plan

**Status**: Complete  
**Created**: 2026-01-27  
**Completed**: 2026-01-27  
**Scope**: Migrate bundle-analyzer and lighthouse tools from podverse-web to monorepo

## Overview

Migrate two performance testing tools from `podverse-web/qa/` to the monorepo at `tools/web-perf/`:

- **Bundle Analyzer**: Next.js bundle size analysis with visualizations
- **Lighthouse**: Performance testing with Playwright browser automation

## Current vs Target State

**Current (podverse-web):**

```
podverse-web/
  qa/
    bundle-analyzer/   # 6 TS files + configs
    lighthouse/        # 14 TS files + configs + assets
    reports/           # Generated (not migrated)
```

**Target (monorepo):**

```
podverse/
  tools/
    web-perf/
      bundle-analyzer/
        src/
        package.json
        tsconfig.json
        README.md
      lighthouse/
        src/
        assets/
        package.json
        tsconfig.json
        .env.example
        .gitignore
        README.md
      reports/
        bundle-analyzer/.gitkeep
        lighthouse/.gitkeep
```

## Sub-Plans

| Plan                        | File                                                                 | Complexity | Status   |
| --------------------------- | -------------------------------------------------------------------- | ---------- | -------- |
| Bundle Analyzer Migration   | [01-bundle-analyzer-migration.md](./01-bundle-analyzer-migration.md) | Moderate   | Complete |
| Lighthouse Migration        | [02-lighthouse-migration.md](./02-lighthouse-migration.md)           | High       | Complete |
| Integration & Documentation | [03-integration-documentation.md](./03-integration-documentation.md) | Low        | Complete |

## Key Path Transformations

Both tools currently use `path.resolve(__dirname, '../../../')` to find podverse-web root.

**Bundle Analyzer paths:**
| Current | New |
|---------|-----|
| `../../../` (web root) | `../../../apps/web` |
| `../../../env/local.env` | `../../../apps/web/env/local.env` |
| `../../../.env.openai` | `../../../.env.openai` |
| `../../tsconfig.json` | `../../../tsconfig.base.json` |
| `../../reports/bundle-analyzer/` | `../reports/bundle-analyzer/` |

**Lighthouse paths:**
| Current | New |
|---------|-----|
| `../../../` (web root) | `../../../apps/web` |
| `../../../env/local.env` | `../../../apps/web/env/local.env` |
| `../podverse-ops` | `../../../../podverse-ops` (sibling repo) |
| `../../tsconfig.json` | `../../../tsconfig.base.json` |
| `../../reports/lighthouse/` | `../reports/lighthouse/` |

## External Dependencies

### Bundle Analyzer

- `apps/web`: Next.js with `@next/bundle-analyzer` in next.config.ts
- Environment: `apps/web/env/local.env` or `apps/web/.env`

### Lighthouse

- `apps/web`: Web app for testing (port 3111)
- `apps/api`: API server (port 1111)
- `podverse-ops` (sibling repo): Database setup via Make commands
- Docker: Test database container on port 5111
- Test assets: RSS feeds served on port 2111

## Execution Order

1. **Bundle Analyzer** - Simpler, fewer dependencies
2. **Lighthouse** - Complex, depends on multiple services
3. **Integration** - Documentation and final testing

## Success Criteria

- [x] Bundle analyzer runs from `tools/web-perf/bundle-analyzer/`
- [x] Lighthouse runs from `tools/web-perf/lighthouse/`
- [x] Reports generate in `tools/web-perf/reports/`
- [x] Both tools can test `apps/web` (and future `apps/management-web`)
- [x] Documentation accurate and complete
- [x] No hardcoded references to `podverse-web/qa/` paths
