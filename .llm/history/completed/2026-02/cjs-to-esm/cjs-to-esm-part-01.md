# Feature: cjs-to-esm (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `cjs-to-esm-part-02.md`.

## Metadata

- Started: 2026-02-01
- Completed: 2026-02-01
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/52
- Branch: chore/cjs-to-esm
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Migrate the Podverse monorepo to ESM (issue #52) with a structured, staged plan.

## Sessions

### Session 1 - 2026-02-01

#### Prompt (Developer)

break this work into small, manageable, yet detailed subplans, thoroughly covering the work that
will be needed

#### Key Decisions

- Split ESM migration into ordered subplans by area (config, packages, apps, workers, scripts).
- Create separate plan files under `.llm/plans/active/esm-migration` for execution clarity.

#### Files Changed

- .llm/plans/active/esm-migration/00-overview.md
- .llm/plans/active/esm-migration/10-config-and-build.md
- .llm/plans/active/esm-migration/20-packages.md
- .llm/plans/active/esm-migration/30-apps-web.md
- .llm/plans/active/esm-migration/40-apps-api.md
- .llm/plans/active/esm-migration/50-apps-workers.md
- .llm/plans/active/esm-migration/60-scripts-and-tools.md
- .llm/plans/active/esm-migration/70-interop-and-verification.md

### Session 2 - 2026-02-01

#### Prompt (Developer)

expand on all of the subplans, one by one, until you have a clear enough plan to reliably work on
the scope of work to complete the esm migration

#### Key Decisions

- Added prereqs, detailed steps, and acceptance criteria to each subplan for execution clarity.

#### Files Changed

- .llm/plans/active/esm-migration/10-config-and-build.md
- .llm/plans/active/esm-migration/20-packages.md
- .llm/plans/active/esm-migration/30-apps-web.md
- .llm/plans/active/esm-migration/40-apps-api.md
- .llm/plans/active/esm-migration/50-apps-workers.md
- .llm/plans/active/esm-migration/60-scripts-and-tools.md
- .llm/plans/active/esm-migration/70-interop-and-verification.md

### Session 3 - 2026-02-01

#### Prompt (Developer)

implement all of the esm-migration plans
/Users/mitcheldowney/repos/pv/podverse

#### Key Decisions

- Start with subplan 10 (config and build alignment) per user selection.

#### Files Changed

- apps/api/tsconfig.json
- apps/management-api/tsconfig.json
- apps/workers/tsconfig.json
- packages/external-services/tsconfig.json
- packages/helpers/tsconfig.json
- packages/mq/tsconfig.json
- packages/notifications/tsconfig.json
- packages/orm/tsconfig.json
- packages/parser/tsconfig.json

### Session 4 - 2026-02-01

#### Prompt (Developer)

/Users/mitcheldowney/repos/pv/podverse

#### Key Decisions

- Proceed with subplan 20 (packages migration) and continue sequentially.
- Use dynamic imports for dotenvx-dependent app entrypoints to preserve env load order.
- Convert standalone Node scripts to `.mjs` and update callers.

#### Files Changed

- apps/api/package.json
- apps/api/src/index.ts
- apps/management-api/package.json
- apps/management-api/src/index.ts
- apps/workers/package.json
- apps/workers/src/index.ts
- apps/management-web/next-intl.config.js (deleted)
- apps/management-web/next-intl.config.mjs
- apps/web/next-intl.config.js (deleted)
- apps/web/next-intl.config.mjs
- packages/external-services/package.json
- packages/external-services/src/factory.ts
- packages/external-services/src/module-alias-config.ts
- packages/external-services/src/services/paypal/index.ts
- packages/helpers/package.json
- packages/helpers-backend/package.json
- packages/helpers-browser/package.json
- packages/helpers-config/package.json
- packages/helpers-requests/package.json
- packages/helpers-validation/client.js
- packages/helpers-validation/package.json
- packages/mq/package.json
- packages/mq/src/module-alias-config.ts
- packages/notifications/package.json
- packages/orm/package.json
- packages/orm/src/module-alias-config.ts
- packages/parser/package.json
- packages/parser/src/module-alias-config.ts
- scripts/dev/local-utils/generate-password-hash.js (deleted)
- scripts/dev/local-utils/generate-password-hash.mjs
- scripts/dev/local-utils/package.json
- scripts/management/create-superuser.js (deleted)
- scripts/management/create-superuser.mjs
- scripts/management/create-superuser.sh
- scripts/publish/bump-version.sh
- apps/api/src/lib/keyvaldb/keyvaldb.ts
- apps/api/src/\*_/_.ts (import path updates for ESM)
- apps/management-api/src/\*_/_.ts (import path updates for ESM)
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx
- apps/web/src/components/SourceSelectors/SourceSelectors.tsx
- apps/workers/src/\*_/_.ts (import path updates for ESM)
- packages/external-services/tsconfig.json
- packages/external-services/src/@types/modules.d.ts
- packages/external-services/src/services/podcast-index/index.ts
- packages/helpers/src/lib/html.ts
- packages/helpers/src/\*_/_.ts (import path updates for ESM)
- packages/mq/src/services/activeMQArtemis/requestService.ts
- packages/mq/src/\*_/_.ts (import path updates for ESM)
- packages/orm/src/services/clip.ts
- packages/orm/src/\*_/_.ts (import path updates for ESM)
- packages/parser/src/lib/compat/partytime/channel.ts
- packages/parser/src/lib/compat/partytime/item.ts
- packages/parser/src/lib/compat/partytime/liveItem.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser/src/\*_/_.ts (import path updates for ESM)
- tools/qa/src/\*_/_.ts (import path updates for ESM)

---

## Related Resources

- [Link to PR]
- [Link to related issues]
