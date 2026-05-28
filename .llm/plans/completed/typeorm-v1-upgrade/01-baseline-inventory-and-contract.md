# Plan 01 — Baseline inventory and contract

## Work location

- **Branch:** `chore/typeorm-v1`
- **Worktree:** `/Users/mitcheldowney/repos/pv/podverse-typeorm-v1`
- Run all commands from the worktree root. Do not run baseline inventory on `develop` or other branches.

## Objective

Capture a **reproducible baseline** of TypeORM usage and a **binding scope contract** before any dependency or code changes. This plan produces documentation only — no product code edits.

## Scope

**In scope for the upgrade (plans 02–09):**

| Path | Role |
| ---- | ---- |
| `packages/orm/` | Entities, services, DataSource factory |
| `packages/parser/` | RSS save paths using `AppDataSourceReadWrite` |
| `apps/api/` | Indirect via `@podverse/orm`; find-option types in controllers |
| `apps/management-api/` | 4× DataSource + 6 management entities |
| `apps/workers/` | ORM context per job; one direct typeorm import |
| `tools/web-perf/lighthouse/` | Standalone minimal DataSource |
| `tools/test-assets/` | Seed script with `getRepository` |
| `scripts/add-by-rss/` | Credential re-encrypt script |
| `.cursor/skills/orm/SKILL.md` | Stale patterns to rewrite in plan 08 |
| Root `package-lock.json` | Linux-canonical lockfile after bump |

**Explicit non-goals:**

- `infra/k8s/base/ops/source/database/linear-migrations/**` — schema unchanged
- TypeORM CLI migrations — not used (`migrations: []` everywhere)
- Metaboost monorepo
- E2E web/management-web (unless API tests fail in plan 09)
- Merging [Dependabot PR #221](https://github.com/podverse/podverse/pull/221) without plans 02–09

## Hard-break contract

Record in the PR or completion note:

1. No `@typeorm/legacy-naming-strategies` / `NamingStrategyV03`.
2. No `invalidWhereValuesBehavior` rollback to ignore null/undefined.
3. No dual-path or feature-flagged TypeORM APIs.
4. Vendor `SnakeNamingStrategy` in `@podverse/orm`; remove `typeorm-naming-strategies`.
5. After upgrade: zero repo-authored references to pre-v1 TypeORM patterns.

## Steps

### 1. Run baseline inventory commands

From worktree root (`/Users/mitcheldowney/repos/pv/podverse-typeorm-v1`):

```bash
cd /Users/mitcheldowney/repos/pv/podverse-typeorm-v1
test "$(git branch --show-current)" = "chore/typeorm-v1"

BASE=/tmp/podverse-typeorm-v1-baseline
mkdir -p "$BASE"

rg "from 'typeorm'" --glob '*.ts' -c \
  --glob '!**/.llm/**' --glob '!**/node_modules/**' \
  | tee "$BASE/typeorm-imports-by-file.txt"
wc -l "$BASE/typeorm-imports-by-file.txt"

rg "relations: \[" --glob '*.ts' -l \
  --glob '!**/.llm/**' \
  | tee "$BASE/string-relations-files.txt"
wc -l "$BASE/string-relations-files.txt"

rg "select: \[" --glob '*.ts' -l \
  --glob '!**/.llm/**' \
  | tee "$BASE/string-select-files.txt"
wc -l "$BASE/string-select-files.txt"

rg "findOne\('" --glob '*.ts' -l \
  --glob '!**/.llm/**' \
  | tee "$BASE/string-entity-findone-files.txt"

rg "typeorm-naming-strategies" --glob '!**/.llm/**' \
  | tee "$BASE/naming-strategies-refs.txt"

rg "getRepository|getConnection|createConnection" --glob '*.ts' \
  --glob '!**/.llm/**' \
  | tee "$BASE/legacy-global-api.txt"

rg "createQueryBuilder" --glob '*.ts' -l \
  --glob '!**/.llm/**' \
  | tee "$BASE/querybuilder-files.txt"
wc -l "$BASE/querybuilder-files.txt"

rg '"typeorm"' package.json packages apps tools -n \
  | tee "$BASE/typeorm-package-json.txt"
```

### 2. Record summary table

Paste into **Completion note** below (not the full dumps):

| Metric | Expected at authoring (~) |
| ------ | ------------------------- |
| Files importing `typeorm` | ~228 |
| Files with string `relations: [` | 45 |
| Files with string `select: [` | 4 |
| Files with `findOne('Entity'` | 1 (`queueResource.ts`) |
| `typeorm-naming-strategies` refs | 2 package.json + 2 TS imports |
| Legacy global API (`getRepository`, etc.) | 0 in app code; check SKILL.md |
| QueryBuilder files | ~18 |
| Direct `typeorm` in package.json | 4 workspaces |

### 3. Confirm Dependabot disposition

- Close or supersede PR #221 with a note that this plan set handles the upgrade.
- Do not merge the bare version bump.

## Known file lists (plan authoring baseline)

### String `relations: [` (45 files)

**packages/orm (28):**

- `packages/orm/src/services/account/account.ts`
- `packages/orm/src/services/account/accountDataExport.ts`
- `packages/orm/src/services/account/accountEmailChangeVerification.ts`
- `packages/orm/src/services/account/accountFollowingAccount.ts`
- `packages/orm/src/services/account/accountFollowingPlaylist.ts`
- `packages/orm/src/services/account/accountPayPalOrder.ts`
- `packages/orm/src/services/account/accountResetPassword.ts`
- `packages/orm/src/services/account/accountSetPassword.ts`
- `packages/orm/src/services/account/accountSettings/accountSettingsLocale.ts`
- `packages/orm/src/services/account/accountSettings/accountSettingsNotificationType.ts`
- `packages/orm/src/services/account/accountVerification.ts`
- `packages/orm/src/services/archiver.ts`
- `packages/orm/src/services/archiver.test.ts`
- `packages/orm/src/services/billingMembershipExtension.ts`
- `packages/orm/src/services/billingRenewalOrchestrator.ts`
- `packages/orm/src/services/category.ts`
- `packages/orm/src/services/channel/channelAbout.ts`
- `packages/orm/src/services/channel/channelPodroll.ts`
- `packages/orm/src/services/channel/channelTrailer.ts`
- `packages/orm/src/services/feed/feed.ts`
- `packages/orm/src/services/item/item.ts`
- `packages/orm/src/services/item/itemAbout.ts`
- `packages/orm/src/services/item/itemSeason.ts`
- `packages/orm/src/services/playlist/playlist.ts`
- `packages/orm/src/services/playlist/playlistResource.ts`
- `packages/orm/src/services/publisherFeed.ts`
- `packages/orm/src/services/queue/queueResource.ts`
- `packages/orm/src/services/queue/queueResourceListGuardrails.test.ts`
- `packages/orm/src/services/stats/statsAggregatedPlaylist.ts`

**apps/api (14):**

- `apps/api/src/controllers/account/account.ts`
- `apps/api/src/controllers/account/accountFollowingAccount.ts`
- `apps/api/src/controllers/account/accountFollowingChannel.ts`
- `apps/api/src/controllers/account/accountFollowingPlaylist.ts`
- `apps/api/src/controllers/clip.ts`
- `apps/api/src/controllers/itemSoundbite.ts`
- `apps/api/src/controllers/membership.ts`
- `apps/api/src/controllers/playlist/playlist.ts`
- `apps/api/src/controllers/profileContent.ts`
- `apps/api/src/controllers/queue/queue.ts`
- `apps/api/src/lib/auth/index.ts`
- `apps/api/src/lib/followed.ts`

**packages/parser (2):**

- `packages/parser/src/lib/rss/liveItem/liveItem.ts`
- `packages/parser/src/lib/rss/remoteItemParser.ts`

**apps/management-api (1):**

- `apps/management-api/src/orm/services/adminAccount.ts`

### String `select: [` (4 files)

- `packages/parser/src/lib/chapters/chapters.ts`
- `packages/parser/src/lib/rss/item/item.ts`
- `apps/workers/src/commands/orm/addByRSS/reencryptCredentials.ts`
- `scripts/add-by-rss/reencrypt-add-by-rss-credentials.ts`

## Key files (reference architecture)

| Concern | Path |
| ------- | ---- |
| ORM factory | `packages/orm/src/factory.ts` |
| Context accessors | `packages/orm/src/context.ts` |
| AppDataSource proxies | `packages/orm/src/db/index.ts` |
| Type re-exports | `packages/orm/src/index.ts` |
| API startup | `apps/api/src/index.ts` |
| Management 4× DS | `apps/management-api/src/index.ts` |
| Linear migrations | `infra/k8s/base/ops/source/database/linear-migrations/` |

## Deliverables

- [x] Baseline commands run; summary table in completion note
- [x] Hard-break contract acknowledged
- [x] Dependabot #221 disposition recorded
- [x] No product code changes

## Completion note

**Executed:** 2026-05-26 on branch `chore/typeorm-v1` at `/Users/mitcheldowney/repos/pv/podverse-typeorm-v1`.

| Metric | Value | Notes |
| ------ | ----- | ----- |
| Files importing `typeorm` | **241** | `packages`, `apps`, `tools`, `scripts` only (includes entities) |
| Files with string `relations: [` | **44** | Plan authoring listed 45; one file may use object syntax only |
| Files with string `select: [` | **4** | Matches plan list |
| Files with `findOne('Entity'` | **1** | `packages/orm/src/services/queue/queueResource.ts` |
| `typeorm-naming-strategies` (product) | **5** | `packages/orm`, `apps/management-api`, `apps/workers` package.json; `factory.ts`, `orm/db/index.ts`, `appDb.ts` imports |
| Legacy global API (`getConnection` / `createConnection`) | **0** | In `*.ts` product code |
| Global `getRepository` from `'typeorm'` | **0** | In `*.ts`; stale examples in `.cursor/skills/orm/SKILL.md` (plan 08) |
| QueryBuilder files | **19** | `createQueryBuilder` in packages/apps/tools/scripts |
| Direct `typeorm` in package.json | **4** | orm, management-api, workers, lighthouse (`^0.3.x`) |

**Dependabot #221:** Close or supersede in favor of this branch; do not merge the bare version bump.

**Hard-break contract:** Recorded in this plan and [00-SUMMARY.md](./00-SUMMARY.md).

## Verification

```bash
test -d /tmp/podverse-typeorm-v1-baseline
test -f /tmp/podverse-typeorm-v1-baseline/string-relations-files.txt
wc -l /tmp/podverse-typeorm-v1-baseline/string-relations-files.txt
```
