# Phase 2 — DB migrations + ORM + DTOs

## Goal

Persist account-level ToS acceptance and listen-stats user preference.

## SQL migrations (greenfield-only)

Create `infra/k8s/base/ops/source/database/linear-migrations/app/0032_account_terms_acceptance.sql`:

```sql
-- 0032: Per-account terms-of-service acceptance audit row.

CREATE TABLE account_terms_acceptance (
    account_id integer NOT NULL PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    terms_version varchar(64) NOT NULL,
    accepted_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_terms_acceptance_terms_version ON account_terms_acceptance(terms_version);
```

Create `0033_account_settings_listen_stats.sql`:

```sql
-- 0033: User preference for first-party listen-stats (popularity tracking).

ALTER TABLE account_settings ADD COLUMN allow_listen_stats boolean NOT NULL DEFAULT true;
```

## Ops bundle

- Add both files to `infra/k8s/base/ops/kustomization.yaml`
- Set `API_EXPECTED_MIGRATION_FILENAME` to `0033_account_settings_listen_stats.sql`
  in `infra/k8s/base/api/source/api.env`
- Run `make db_regen_linear_baseline`; commit `0003a_` / `0003b_` gz

## ORM

| File | Action |
| --- | --- |
| `packages/orm/src/entities/account/accountTermsAcceptance.ts` | New entity (`account_id` PK) |
| `packages/orm/src/entities/account/accountSettings.ts` (or equivalent) | Add `allow_listen_stats` column |
| `packages/orm/src/entities/account/account.ts` | `@OneToOne` → `account_terms_acceptance` |
| `packages/orm/src/services/account/accountTermsAcceptance.ts` | `getByAccountId`, `upsert` |
| `packages/orm/src/db/entities.ts` | Register entity |
| `packages/orm/src/index.ts` | Export entity + service |

Mirror `account_metaboost` 1:1 pattern for terms acceptance service.

## DTOs (`@podverse/helpers`)

- `packages/helpers/src/dtos/account/accountTermsAcceptance.ts` — new
- Extend `DTOAccount` with optional `account_terms_acceptance`
- Extend account settings DTO with `allow_listen_stats: boolean`

## Account creation hook (prep for phase 3)

In `AccountService.create`, accept optional params for later wiring:

- `terms_version: string` → insert `account_terms_acceptance`
- `allow_listen_stats?: boolean` → set on `account_settings` (default true)

Do not wire HTTP yet if splitting PRs; at minimum service layer ready.

## Exit criteria

- Migrations apply on test DB (`make test_deps`)
- Entity compiles; unit test for `AccountTermsAcceptanceService.upsert` optional
- Baseline gz committed

## Verification

```bash
make test_deps
./scripts/nix/with-env npm run build:packages
```
