---
name: podverse-management-api-patterns
description: Common patterns for the podverse-management-api Express application
version: 1.0.0
---

# Podverse Management API Development Patterns

## Overview

The Management API follows the same patterns as the main API. See the [API Skill](../api/SKILL.md) for detailed patterns.

## Key Differences

- **Location**: `apps/management-api/`
- **Purpose**: Administrative operations and internal tooling
- **Authentication**: Uses admin-specific auth middleware

## Import aliases (in-app)

Internal imports within `apps/management-api/src` use **`@management-api/*`** → `src/*` (full directory name — not `@mgmt-api`). See `.cursor/rules/app-internal-import-aliases.mdc`.

```typescript
import { config } from '@management-api/config/index.js';
import { AdminAccountService } from '@management-api/orm/services/adminAccount.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
```

## TypeScript Express Patterns

All TypeScript Express patterns from the main API apply here. See the [API Skill - TypeScript Express Patterns](../api/SKILL.md#typescript-express-patterns) section for:

- Route handler return types (`Promise<void>`)
- Correct response method patterns
- Catch block return statements

## File Structure

```
apps/management-api/
├── src/
│   ├── routes/          # Route definitions
│   ├── lib/             # Utilities and helpers
│   │   ├── auth/        # Authentication middleware
│   │   └── startup/     # App initialization
│   └── index.ts         # Entry point
├── package.json
└── tsconfig.json
```

## See Also

- **[API Patterns](../api/SKILL.md)** - All Express patterns apply
- **[ORM Patterns](../orm/SKILL.md)** - Database patterns
- **[Global Patterns](../global/SKILL.md)** - Monorepo conventions
