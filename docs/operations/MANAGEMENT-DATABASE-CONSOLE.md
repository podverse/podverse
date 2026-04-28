# Management Database Console

Operational documentation for the Podverse management database console.

## Overview

The management database console provides a policy-driven, metadata-driven interface for admins to browse and manage data in the Podverse app database through the management-web UI.

**Currently allowlisted tables:**

| Table                     | Permission Resource        | Read-Only     | Writable Fields                                                                                         |
| ------------------------- | -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `feed`                    | `feeds`                    | Yes (default) | `feed_flag_status_id`, `feed_flag_status_reason_id`, `feed_flag_status_reason_note`, `parsing_priority` |
| `feed_flag_status`        | `feed_flag_statuses`       | No            | None (all fields non-updatable)                                                                         |
| `feed_flag_status_reason` | `feed_flag_status_reasons` | No            | `reason`                                                                                                |

## Architecture

- **Backend**: `apps/management-api` exposes generic REST endpoints under `/api/v1/database/` that read/write the app database (`podverse_app`)
- **Frontend**: `apps/management-web` renders dynamic table browsers and forms based on metadata from the API
- **Policy**: `apps/management-api/src/lib/database/tablePolicy.ts` defines the allowlist, field rules, and query bounds
- **Audit**: All write operations emit records to the `database_audit_log` table in the management database

## Permissions

Access is controlled by CRUD bitmask permissions per resource:

| Bit | Operation |
| --- | --------- |
| 1   | Create    |
| 2   | Read      |
| 4   | Update    |
| 8   | Delete    |

Example: `feeds_crud = 6` grants read + update but not create or delete.

Superusers bypass all permission checks.

## Query Bounds

| Parameter                | Limit          |
| ------------------------ | -------------- |
| Max page size            | 100            |
| Max filters per query    | 10             |
| Max sort clauses         | 3              |
| Max values per IN filter | 50             |
| Max LIKE value length    | 100 characters |
| Max mutation fields      | 20             |

## Feature Flags

High-risk table writes are disabled by default and controlled via environment variables:

| Variable                       | Purpose                                                               |
| ------------------------------ | --------------------------------------------------------------------- |
| `MGMT_DB_ALLOWED_WRITE_TABLES` | Comma-separated list of table names allowed for writes (e.g., `feed`) |

The `feed` table is read-only unless `feed` appears in this list.

## API Endpoints

| Method | Path                     | Description                                |
| ------ | ------------------------ | ------------------------------------------ |
| GET    | `/database/tables`       | List all allowlisted tables with metadata  |
| GET    | `/database/:table/meta`  | Get field metadata for a specific table    |
| POST   | `/database/:table/query` | Query rows with filters, sorts, pagination |
| GET    | `/database/:table/:id`   | Get a single row by primary key            |
| POST   | `/database/:table`       | Create a new row                           |
| PATCH  | `/database/:table/:id`   | Update an existing row                     |
| DELETE | `/database/:table/:id`   | Delete a row                               |

## Adding a New Table

See [Allowlist Onboarding](../../.llm/plans/active/management-web-database-console/91-allowlist-onboarding.md) for the step-by-step checklist.

## Audit Trail and Rollback

See [Audit and Rollback Runbook](../../.llm/plans/active/management-web-database-console/92-audit-rollback-runbook.md) for incident response procedures.

## Database Migrations

| File                                                                 | Description                                    |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| `infra/k8s/ops/source/management/0002_admin_account_permissions.sql` | Admin CRUD permissions table                   |
| `infra/k8s/ops/source/management/0003_database_audit_log.sql`        | Audit log table for database console writes    |
| `infra/k8s/ops/source/app/0017_feed_flag_status_reason.sql`          | Feed flag status reason table and feed columns |
