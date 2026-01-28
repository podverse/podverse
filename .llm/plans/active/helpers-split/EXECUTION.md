# Quick Start Guide - 6-Package Helpers Split

## TL;DR

Split `@podverse/helpers` into 6 platform-aware packages to save ~2.4MB on frontend and support future mobile apps.

## Agent Assignment (Maximum Parallelization)

### Phase 1: Create Packages (5 agents in parallel)

```bash
Agent 1: 01a-create-helpers-validation.md
Agent 2: 01b-create-helpers-requests.md
Agent 3: 01c-create-helpers-backend.md
Agent 4: 01d-create-helpers-browser.md
Agent 5: 01e-create-helpers-config.md
```

**Wait for ALL Phase 1 to complete**

### Phase 2: Update Core (1 agent)

```bash
Agent 6: 02-update-helpers-core.md
```

**Wait for Phase 2 to complete**

### Phase 3: Update Imports (10 agents in parallel)

```bash
Agent 7:  03a-update-web-app.md
Agent 8:  03b-update-api-app.md
Agent 9:  03c-update-workers-app.md
Agent 10: 03d-update-management-api.md
Agent 11: 03e-update-orm-package.md
Agent 12: 03f-update-parser-package.md
Agent 13: 03g-update-mq-package.md
Agent 14: 03h-update-notifications-package.md
Agent 15: 03i-update-documentation.md
Agent 16: 03j-update-management-web.md
```

**Wait for ALL Phase 3 to complete**

### Phase 4: Verify (1 agent)

```bash
Agent 17: 04-verification.md
```

## Package Purpose & Platform Support

| Package                | Purpose                       | Platform             | Deps Size |
| ---------------------- | ----------------------------- | -------------------- | --------- |
| **helpers**            | Core DTOs, types, utils       | ✅ All               | ~570KB    |
| **helpers-validation** | Email/password/URL validation | ✅ All               | ~200KB    |
| **helpers-requests**   | API client                    | ✅ Web + Mobile      | ~500KB    |
| **helpers-backend**    | Logging, BigNumber            | ✅ Backend only      | ~2.3MB    |
| **helpers-config**     | Config/env validation         | ✅ Backend + Scripts | ~0KB      |
| **helpers-browser**    | Browser utilities             | ✅ Browser only      | minimal   |
| **helpers-mobile**     | React Native utils (future)   | ✅ Mobile only       | TBD       |

### Platform Legend

- ✅ All = Browser, React Native, Node.js
- ✅ Web + Mobile = Browser, React Native
- ✅ Backend only = Node.js only
- ✅ Backend + Scripts = Node.js + build scripts
- ✅ Browser only = Browser APIs (navigator, document)
- ✅ Mobile only = React Native APIs

## Expected Results

- Frontend bundle: **-2.4MB** (winston, bignumber removed)
- Backend apps: **-0.5MB** (small optimization)
- **Mobile ready**: Universal packages work in React Native
- Clear separation: Platform-specific code isolated

## Import Examples

```typescript
// ✅ Core types (all platforms):
import { DTOAccount, MediumEnum } from '@podverse/helpers';

// ✅ Validation (all platforms):
import { validateEmail, isValidHttpUrl } from '@podverse/helpers-validation';

// ✅ API requests (web + mobile):
import { requestAccount } from '@podverse/helpers-requests';

// ✅ Backend logging (Node.js only):
import { LoggerService, TimerManager } from '@podverse/helpers-backend';

// ✅ Config validation (Node.js only):
import { validateRequired, validateORMConfig } from '@podverse/helpers-config';

// ✅ Browser utilities (browser only):
import { copyToClipboard } from '@podverse/helpers-browser';
```

## Mobile App Compatibility

When adding React Native apps later:

```typescript
// ✅ These work in React Native:
import { DTOAccount } from '@podverse/helpers';
import { validateEmail, isValidHttpUrl } from '@podverse/helpers-validation';
import { requestAccount } from '@podverse/helpers-requests';

// ❌ These DON'T work in React Native:
import { LoggerService } from '@podverse/helpers-backend'; // Node.js only
import { validateRequired } from '@podverse/helpers-config'; // uses process.env
import { copyToClipboard } from '@podverse/helpers-browser'; // uses navigator

// ➕ Future mobile package:
import { Clipboard } from '@podverse/helpers-mobile'; // RN Clipboard API
```

## Rollback

If anything breaks, see rollback procedures in `04-verification.md`.

## Total Time

~60 minutes with full parallelization (17 agents)
~2-3 hours without parallelization
