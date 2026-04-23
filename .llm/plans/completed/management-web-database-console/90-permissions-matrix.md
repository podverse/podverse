# Admin CRUD Permissions Matrix

This document defines the initial authorization matrix for Podverse `management-api` and
`management-web` in the database-console project.

## Core Rules

- `superuser` always has full CRUD permissions.
- `admin` permissions are resource-scoped and explicitly assigned; no implied CRUD access.
- An admin cannot change their own CRUD permissions.
- API checks are authoritative; UI checks are usability layers only.

## CRUD Bits

Use a 4-bit mask per resource:

- `1` = Create
- `2` = Read
- `4` = Update
- `8` = Delete

Examples:

- `0` = none
- `2` = read-only
- `6` = read + update
- `15` = full CRUD

## Initial Resource Keys

- `admins`
- `databaseFeedTables`
- `databaseFeedRows`
- `workers`

Add more keys only via explicit schema and policy updates.

## V1 Resource Scope Lock

- `databaseFeedTables` and `databaseFeedRows` map only to:
  - `feed`
  - `feed_flag_status`
  - `feed_flag_status_reason`
- No non-feed table permissions are in scope for v1.

## Role Matrix (Initial)

| Actor Type | Admin Management | Database Tables | Database Rows | Workers |
| ---------- | ---------------- | --------------- | ------------- | ------- |
| superuser  | 15               | 15              | 15            | 15      |
| admin      | configurable     | configurable    | configurable  | configurable |

## Sensitive Guardrails

- Non-superusers cannot update or delete superuser accounts.
- Non-superusers cannot assign permissions they do not have.
- Admin self-permission updates are blocked server-side.
- High-risk table write operations require explicit feature-flag enablement.

## API Enforcement Checklist

- Middleware resolves actor role + permission masks from authenticated context.
- `requireCrud(resource, op)` is applied per route and operation.
- Controllers enforce target-actor rules (self restrictions and superuser protections).
- Audit records are created for every successful write.
