# Phase 4: Fix Non-Null Assertions in index.ts

**Status:** Pending

## Overview

Fix the 10 non-null assertion warnings in `apps/api/src/index.ts` by using the validated config object and proper null handling.

## File to Modify

- `apps/api/src/index.ts`

## Warnings Breakdown

### Environment Variables (9 warnings, lines 76-82)

These are `process.env.XXX!` assertions for database configuration:

- `DB_HOST`
- `DB_PORT`
- `DB_READ_USERNAME`
- `DB_READ_PASSWORD`
- `DB_READ_WRITE_USERNAME`
- `DB_READ_WRITE_PASSWORD`
- `DB_DATABASE`

**Fix:** These env vars are validated at startup in `lib/startup/validation.ts`. Add an eslint-disable comment for this block, similar to `config/index.ts`.

### serverInstance (1 warning, line 30)

Inside the shutdown function, `serverInstance!` is used in a callback where TypeScript loses the narrowing.

**Fix:** Capture the value in a local variable before the callback:

```typescript
if (serverInstance) {
  const server = serverInstance;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
```

## Implementation

### Option A: Targeted eslint-disable (Recommended)

Add eslint-disable comment for the ormConfig block since these are validated at startup:

```typescript
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- env vars validated at startup
const ormConfig = {
  // ...
};
```

### Option B: Move DB config to config/index.ts

Move the database configuration to the centralized config file which already has the eslint-disable for the entire file.

## Notes

- The `config/index.ts` file already has a file-level eslint-disable comment with explanation
- Startup validation in `lib/startup/validation.ts` ensures these env vars exist before the app runs
