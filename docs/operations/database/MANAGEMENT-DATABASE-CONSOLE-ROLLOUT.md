# Management Database Console Rollout Plan

## Feature-Flag Gated Release

The management database console is protected by multiple layers of access control:

1. **Authentication**: JWT-based admin authentication required for all endpoints
2. **Authorization**: Per-table CRUD bitmask permissions
3. **Table Policy**: Only explicitly allowlisted tables are accessible
4. **Read-Only by Default**: High-risk tables (`feed`) are read-only unless enabled via feature flag

## Staged Enablement

### Phase 1: Read-Only Access (Current Default)

- All three tables (`feed`, `feed_flag_status`, `feed_flag_status_reason`) are readable by admins with appropriate permissions
- `feed` table is read-only
- `feed_flag_status` and `feed_flag_status_reason` support full CRUD
- No feature flags required for this phase

### Phase 2: Enable Feed Table Writes

To enable writes to the `feed` table:

1. Set environment variable on the management-api deployment:
   ```
   MGMT_DB_ALLOWED_WRITE_TABLES=feed
   ```
2. Redeploy management-api
3. Verify write operations work in staging
4. Roll out to production

### Phase 3: Additional Tables

Follow the management-web database console allowlist checklist for each new table.

## Rollback Procedures

### Disable Feed Writes

Remove `feed` from `MGMT_DB_ALLOWED_WRITE_TABLES` (or unset the variable) and redeploy. The table reverts to read-only.

### Emergency Disable All Database Console Access

1. Remove CRUD read permissions from affected admin accounts
2. Or set all tables to `readOnly: true` in `tablePolicy.ts` and redeploy

### Data Rollback

Use the `database_audit_log` table to identify affected rows and restore previous values. See management-api ops runbooks for rollback steps.

## Post-Release Monitoring Checklist

- [ ] Verify audit logs are being written for all mutations
- [ ] Check error rates on `/database/` endpoints
- [ ] Verify unauthorized access returns 403 consistently
- [ ] Monitor query performance on listed tables
- [ ] Confirm read-only tables reject writes with 403
- [ ] Verify sensitive field redaction in audit payloads
- [ ] Test permission boundary cases (admin with partial CRUD)
