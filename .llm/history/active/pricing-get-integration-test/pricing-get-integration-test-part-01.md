# pricing-get-integration-test

### Session 1 - 2026-05-06

#### Prompt (Developer)

Fix GET /pricing integration test (costMonthly / costAnnually)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Aligned default test env and `/pricing` assertion with active `billing_price` seed ($3/$30) and `apps/api/.env.example`; documented in test that catalog overrides raw MEMBERSHIP\_\* when rows exist.

#### Files Created/Modified

- apps/api/src/test/setup.ts
- apps/api/src/test/external-services-and-meta.test.ts
- .llm/history/active/pricing-get-integration-test/pricing-get-integration-test-part-01.md

---

### Session 2 - 2026-05-06

#### Prompt (Developer)

Fix GET /pricing test vs test env trial length

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- `/pricing` assertion now uses `resolveProductMembershipDefaultsFromEnv().freeTrialExpirationSeconds` so trial fields match `MEMBERSHIP_FREE_TRIAL_EXPIRATION` from `apps/api/src/test/setup.ts` and the `product_membership_settings` seed path (86400s / 1 day in tests), instead of `DEFAULT_FREE_TRIAL_EXPIRATION` (31 days).

#### Files Created/Modified

- apps/api/src/test/external-services-and-meta.test.ts
- .llm/history/active/pricing-get-integration-test/pricing-get-integration-test-part-01.md
