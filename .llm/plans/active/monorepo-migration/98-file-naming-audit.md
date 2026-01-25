# File Naming Audit

**Status**: Pending (post-migration)
**Priority**: Low

## Purpose

After code migration is complete, audit all files to ensure naming follows conventions defined in `.llm/context/conventions.md`.

## Convention

**Files: kebab-case**

Examples:
- ✓ `account-service.ts`
- ✓ `podcast-controller.ts`
- ✓ `rss-parser.ts`
- ✗ `AccountService.ts`
- ✗ `podcastController.ts`
- ✗ `rss_parser.ts`

## Scope

Directories to audit:
- `packages/*/src/**/*.ts`
- `apps/*/src/**/*.ts`
- `tools/*/src/**/*.ts`

Exclude:
- `node_modules/`
- `dist/`
- Config files (package.json, tsconfig.json, etc.)
- Type definition files (`*.d.ts`)

## Audit Script (Example)

```bash
# Find files not matching kebab-case
find packages apps tools -name "*.ts" -type f | \
  grep -v node_modules | \
  grep -v dist | \
  grep -v "\.d\.ts$" | \
  while read f; do
    basename "$f" | grep -qE '^[a-z][a-z0-9-]*\.ts$' || echo "$f"
  done
```

## Common Patterns to Check

| Pattern | Convention | Example |
|---------|------------|---------|
| Service files | `*-service.ts` | `account-service.ts` |
| Controller files | `*-controller.ts` | `podcast-controller.ts` |
| Utility files | `*-utils.ts` or `*-helpers.ts` | `date-utils.ts` |
| Type files | `*-types.ts` or `*.types.ts` | `api-types.ts` |
| Test files | `*.test.ts` or `*.spec.ts` | `account-service.test.ts` |
| Index files | `index.ts` | `index.ts` |

## When to Execute

- After Phase 3 (App Migration) is complete
- Before archiving original repositories
- Can be done incrementally during migration

## Checklist

- [ ] Run audit script on `packages/`
- [ ] Run audit script on `apps/`
- [ ] Run audit script on `tools/`
- [ ] Rename non-conforming files
- [ ] Update imports after renames
- [ ] Verify builds pass after renames
