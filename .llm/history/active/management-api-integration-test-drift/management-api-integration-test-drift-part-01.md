## Metadata

- **Started:** 2026-05-05
- **Author:** Cursor agent
- **Context:** Management-api Vitest drift after billing/product routes

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/10.txt:7-499 debug. identify if this is an actual implementation error or just an invalid test that needs to be fixed, then fix it.

#### Key Decisions

- **stats.integration.test.ts:** Failure was mock drift, not production code. `AppDbDataSourceReadWrite` was missing from the `@mgmt-api/orm/db/appDb.js` mock after product routes began importing `BillingPriceCatalogService` with read/write datasource at module load.
- **database.integration.test.ts:** Hardcoded table count `11` was obsolete; `TABLE_POLICIES` grew (billing + feed policy tables). Assert `TABLE_POLICIES.length` so the test tracks the allowlist.

#### Files Created/Modified

- `apps/management-api/src/routes/stats.integration.test.ts`
- `apps/management-api/src/routes/database.integration.test.ts`
- `.llm/history/active/management-api-integration-test-drift/management-api-integration-test-drift-part-01.md`

---

### Session 2 - 2026-05-06

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/10.txt:7-384 debug

#### Key Decisions

- **401 on PATCH `/product/membership` (supertest):** Failure matches `ensureAuthenticated` → `verifyToken` (`Unauthorized`), not handler logic. Cookie was chosen before `Authorization: Bearer`, so a bad `pv_mgmt_auth` value could override a valid Bearer token.
- **Fix:** Resolve token with **Bearer first**, then session cookie (`getAuthTokenFromRequest`). Added auth integration coverage for stale cookie + valid Bearer.

#### Files Created/Modified

- `apps/management-api/src/lib/auth/index.ts`
- `apps/management-api/src/routes/auth.integration.test.ts`
- `.llm/history/active/management-api-integration-test-drift/management-api-integration-test-drift-part-01.md`
