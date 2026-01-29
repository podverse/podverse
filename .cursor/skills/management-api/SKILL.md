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

## Import Aliases

```typescript
import { config } from '@mgmt-api/config';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount';
import { ensureAuthenticated } from '@mgmt-api/lib/auth';
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
