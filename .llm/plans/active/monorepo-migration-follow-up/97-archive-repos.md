# Phase 97: Archive Original Repos

**Status**: Planned (execute after full monorepo migration + successful deployments)
**Effort**: ~2-3 hours
**Dependencies**: All migration phases complete, 2+ successful alpha deployments, team confirmation

> **Note**: Renumbered from 05c to 97 to indicate this happens at the very end of the migration process.

## Overview

Archive the 13 original repositories after the monorepo is proven stable.

## Prerequisites

From master plan, archive only after:

- [ ] 2+ successful alpha deployments from monorepo
- [ ] All team members confirm workflow works
- [ ] No critical issues for 1+ week

## Repositories to Archive

| Repository                 | Package/App                  | Status  |
| -------------------------- | ---------------------------- | ------- |
| podverse-helpers           | @podverse/helpers            | Pending |
| podverse-external-services | @podverse/external-services  | Pending |
| podverse-orm               | @podverse/orm                | Pending |
| podverse-notifications     | @podverse/notifications      | Pending |
| podverse-parser            | @podverse/parser             | Pending |
| podverse-mq                | @podverse/mq                 | Pending |
| podverse-api               | apps/api                     | Pending |
| podverse-web               | apps/web                     | Pending |
| podverse-workers           | apps/workers                 | Pending |
| podverse-management-api    | apps/management-api          | Pending |
| podverse-management-web    | apps/management-web          | Pending |
| podverse-qa                | tools/qa                     | Pending |
| podverse-ops               | infra/, scripts/, pipelines/ | Pending |

## Tasks

### 1. Create Deprecation Notice Template

**File**: `docs/DEPRECATION-TEMPLATE.md`

````markdown
# ⚠️ DEPRECATED

This repository has been merged into the [Podverse Monorepo](https://github.com/podverse/podverse).

## Migration Guide

The code from this repository is now located at:

- **Package**: `packages/{name}/` in the monorepo
- **App**: `apps/{name}/` in the monorepo

## Installation

```bash
# Old (deprecated)
npm install podverse-{name}

# New
npm install @podverse/{name}
```
````

## Development

Clone the monorepo instead:

```bash
git clone https://github.com/podverse/podverse.git
cd podverse
nvm use && npm install
```

## Questions?

Open an issue in the [monorepo](https://github.com/podverse/podverse/issues).

````

### 2. Archive Process (Per Repo)

For each repository:

1. **Update README.md**
   - Add deprecation notice at the top
   - Keep existing content for reference

2. **Update repository description**
   - Set to: "DEPRECATED - Merged into github.com/podverse/podverse"

3. **Update repository topics**
   - Add: `deprecated`, `archived`

4. **Archive the repository**
   - GitHub → Settings → Danger Zone → Archive

5. **Verify**
   - Confirm repo shows as archived
   - Confirm README displays deprecation notice

### 3. Update npm Package Descriptions

For published packages, update npm description:

```bash
npm deprecate podverse-helpers "This package has moved to @podverse/helpers"
````

Note: This shows a warning when users install the old package.

### 4. Verify No Breaking Links

Check for:

- Links from external documentation
- Links from npm package pages
- Links from other Podverse repos (mobile apps)

## Checklist

- [ ] Create deprecation notice template
- [ ] Archive podverse-helpers
- [ ] Archive podverse-external-services
- [ ] Archive podverse-orm
- [ ] Archive podverse-notifications
- [ ] Archive podverse-parser
- [ ] Archive podverse-mq
- [ ] Archive podverse-api
- [ ] Archive podverse-web
- [ ] Archive podverse-workers
- [ ] Archive podverse-management-api
- [ ] Archive podverse-management-web
- [ ] Archive podverse-qa
- [ ] Archive podverse-ops
- [ ] Update npm deprecation notices
- [ ] Verify no breaking links

## Repos NOT Being Archived

- **partytime** - External fork, stays separate
- **podverse-ansible** - Contains private keys, stays separate

## Rollback

If issues arise after archiving:

1. Unarchive the repository (GitHub Settings)
2. Remove deprecation notice
3. Resume development on original repo

## Notes

- Archiving is reversible but should be treated as final
- npm packages will continue to work (just show deprecation warning)
- GitHub redirects work for archived repos
