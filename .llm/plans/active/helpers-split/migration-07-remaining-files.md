# Migration Part 7: Comprehensive Web App Scan

## Scope

Find ALL remaining files in `apps/web/src` that import QueryParams types (excluding Medium/QueueMedium) from the wrong package.

## Strategy

### Step 1: Comprehensive Search

Search for all QueryParams types that moved to `@podverse/helpers-requests`:

```bash
cd /Users/mitcheldowney/repos/pv/podverse/apps/web/src

# Search for specific types known to have moved
rg "QueryParamsChannel[^M]" --type ts --type tsx
rg "QueryParamsHome" --type ts --type tsx
rg "QueryParamsItem[^s]" --type ts --type tsx
rg "QueryParamsPlaylist" --type ts --type tsx
rg "QueryParamsSubscribed" --type ts --type tsx
rg "QueryParamsGlobal" --type ts --type tsx
rg "QueryParamsCategory" --type ts --type tsx
rg "QueryParamsClips" --type ts --type tsx
rg "QueryParamsHistory" --type ts --type tsx
rg "QueryParamsQueues" --type ts --type tsx
rg "QueryParamsAutoQueue" --type ts --type tsx
rg "QueryParamsDirection" --type ts --type tsx
rg "QueryParamsPage[^R]" --type ts --type tsx
rg "QueryParamsShuffle" --type ts --type tsx
rg "QueryParamsStatsRange" --type ts --type tsx
rg "QueryParamsLiveItem" --type ts --type tsx
rg "QueryParamsProfile" --type ts --type tsx
rg "QueryParamsAccount" --type ts --type tsx
rg "QueryParamsGetMany" --type ts --type tsx
rg "QueryParamsIndividual" --type ts --type tsx
```

### Step 2: Filter by Import Source

For each file found, check if it imports from `@podverse/helpers` (wrong) or `@podverse/helpers-requests` (correct).

### Step 3: Pattern-Based Migration

Group files by import pattern:

**Pattern A**: Pure QueryParams (just add helpers-requests import)
**Pattern B**: Mixed with DTOs (split into two imports)  
**Pattern C**: Mixed with Medium/QueueMedium (split carefully)

### Step 4: Bulk Update

Use find/replace for each pattern to update all files efficiently.

## Expected Files

Based on previous exploration, expect to find imports in:

- `apps/web/src/utils/localSettings/localSettings.ts` (7 QueryParams types)
- Various dropdown config files
- Page components
- Context providers
- Custom hooks
- Utility functions

## Execution Order

1. Run comprehensive search
2. Categorize by pattern
3. Update in bulk by pattern
4. Verify with TypeScript compilation

## Status

⏳ Pending - requires comprehensive search first

## Notes

This is the "catch-all" migration to find any files missed by the targeted scans.
