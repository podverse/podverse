# Wave 2 — Workers Core Jobs

## Targets

- [apps/workers/package.json](apps/workers/package.json)
- [apps/workers/src/lib/startup/categoriesForCommand.ts](apps/workers/src/lib/startup/categoriesForCommand.ts)
- [apps/workers/src/commands/commandNames.ts](apps/workers/src/commands/commandNames.ts)

## Intent

Workers lack a Vitest harness. Add minimal `vitest` + config with `@workers` path alias. Test **pure startup mapping** (`getCategoriesForCommand`) so command→category regressions fail fast without DB/MQ.

## Planned tests

1. **Category sets for representative commands**
   - `archiveAll` → Base + ORM.
   - `mqRSSRunParser` → full stack categories (ORM, MQ, Parser, PodcastIndex, WebNotifications).
   - `podcastIndexDeadFeedsDeleteCache` → Base only.

2. **KNOWN_COMMANDS** (optional light check): critical commands present.

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/workers
```
