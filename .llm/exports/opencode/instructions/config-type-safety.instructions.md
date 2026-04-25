---
description: "Config and type safety rules - no defaults, no non-null assertions"
applyTo:
  - "**/config/index.ts"
  - "**/config/*.ts"
---

# Config and Type Safety Rules

## Critical Requirements

### 1. Never Set Default Values in Config Files

**NEVER** set default values for environment variables in `config/index.ts` files. This includes:
- Empty strings: `process.env.VAR || ''`
- Fallback values: `process.env.VAR || 'default'`
- Nullish coalescing: `process.env.VAR ?? ''`

**Why**: Default values hide configuration errors and allow apps to start with invalid state.

### 2. Use Non-Null Assertions (`!`) in Config Files Only

Config files are the **one exception** where `!` assertions are allowed, because:
- All env vars must pass through startup validation before config is used
- Validation ensures required values exist before the app starts
- This keeps config files clean and typed as `string` (not `string | undefined`)

**Pattern for config files:**

```typescript
/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

export const config = {
  nodeEnv: process.env.NODE_ENV!,
  apiPort: process.env.API_PORT!,
  database: {
    host: process.env.DB_HOST!,
  },
};
```

### 3. Avoid Non-Null Assertions Elsewhere

Outside of config files, **avoid** `!` assertions. Prefer:
1. Proper null checks or optional chaining
2. Type guards
3. Helper functions that throw meaningful errors

## Approved Patterns

### Backend Apps (api, workers, management-api)

1. **Create startup validation** (`lib/startup/validation.ts`):
```typescript
import { validateRequired } from '@podverse/helpers';

export const validateStartupRequirements = (): void => {
  const results = [];
  results.push(validateRequired('DB_HOST', 'App database'));
  results.push(validateRequired('DB_APP_NAME', 'App database'));
  results.push(validateRequired('API_PORT', 'API'));
  // ... validate all required env vars
  
  if (results.some(r => !r.isValid && r.isRequired)) {
    throw new Error('Missing required environment variables');
  }
};
```

2. **Call validation early in app startup** (`index.ts`):
```typescript
import { validateStartupRequirements } from './lib/startup/validation';

// Validate BEFORE importing config
validateStartupRequirements();

// Now safe to import and use config
import { config } from './config';
```

3. **Use `!` in config with eslint-disable** (`config/index.ts`):
```typescript
/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

export const config = {
  dbHost: process.env.DB_HOST!,
  apiPort: process.env.API_PORT!,
};
```

### Next.js Apps (web, management-web)

For Next.js apps, validate at build time via `scripts/validate-env.ts` and prebuild hook.

## Summary

| Location | `!` Allowed | Default Values |
|----------|-------------|----------------|
| `config/index.ts` | ✅ Yes (with eslint-disable) | ❌ Never |
| Other files | ❌ Avoid | Use at point of use if needed |
