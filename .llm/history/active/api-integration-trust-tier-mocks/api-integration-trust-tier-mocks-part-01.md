# api-integration-trust-tier-mocks

## Session 1 - 2026-05-06

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/10.txt:7-911 debug. identify if this is an actual implementation error or just an invalid test that needs to be fixed, then fix it.

#### Key Decisions

- Mixed causes: **account-follows** mock missing `hasFollowedAddByRSSChannel` / `getFollowedAddByRSSChannelCount` (invalid mock vs production); **403** tests using `AccountService.get` mocks without `account_membership.id === Premium` so `getAccountEntitlements` treated users as Trial (`trackStats` / `allowNotifications` / `allowDirectoryAddByRSS` false); **external-services** `beforeEach` reset `getAccountMock` to membership-only shape and dropped Premium/tier; **billing** duplicate key: seed INSERTs hit existing open-window rows and PG aborted the txn on unique violation—fixed with savepoints + swallow unique violations (`23505` / message match).
- Shared default mock account updated in `mockAccount.ts` with `account_membership: { id: AccountMembershipEnum.Premium }`.
- `BillingPriceCatalogService.ensurePremiumPricingSeededFromEnv`: savepoints around monthly/annual inserts; idempotent handling when open window already exists (migration + concurrent callers).

#### Files Created/Modified

- packages/orm/src/services/billingPriceCatalog.ts
- apps/api/src/test/helpers/mockAccount.ts
- apps/api/src/test/account-follows-notifications.test.ts
- apps/api/src/test/account-settings.test.ts
- apps/api/src/test/external-services-and-meta.test.ts
- .llm/history/active/api-integration-trust-tier-mocks/api-integration-trust-tier-mocks-part-01.md
