# membership-claim-token-claim-test-fix

## Session 1 - 2026-05-05

#### Prompt (Developer)

Fix `membershipClaimToken.claim.test.ts` ORM context failures

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Failure was an incomplete Vitest mock: `MembershipClaimTokenService` constructs `BillingRenewalOrchestratorService`, whose constructor calls `getDataSourceRead()` without ORM context in unit tests.
- Added `vi.mock('@orm/services/billingRenewalOrchestrator.js')` with stub methods resolving void so construction stays isolated from global ORM setup.

#### Files Created/Modified

- packages/orm/src/services/membershipClaimToken.claim.test.ts
- .llm/history/active/membership-claim-token-claim-test-fix/membership-claim-token-claim-test-fix-part-01.md
