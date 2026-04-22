### Session 1 - 2026-04-22

#### Prompt (Developer)

Fix API test auth regressions

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/11.txt:7-1036 there are multiple errors. debug and fix them.

#### Prompt (Developer)

Fix API test auth regressions

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Keep `GET /podroll/channel/:idOrIdText` public (200 without auth).
- Keep `POST /account/notification/channel/type` semantics as 401 when unauthenticated and 403 only for membership-denied authenticated users.
- Harden test assertions and isolate auth behavior to prevent cross-test leakage.
- Add `vi.resetModules()` in API test app bootstrap helper so each test file gets a fresh app/module graph and its own active `@podverse/orm` mock definitions.
- Verify with targeted specs, full `apps/api` suite, `test:e2e:api`, and full `npm test`.

#### Files Modified

- apps/api/src/test/account-follows-notifications.test.ts
- apps/api/src/test/category-channel-item-read.test.ts
- apps/api/src/test/helpers/index.ts
- .llm/history/active/api-test-auth-regressions/api-test-auth-regressions-part-01.md
