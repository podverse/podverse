### Session 1 - 2026-04-22

#### Prompt (Developer)

Reduce expected error noise in API tests

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Use targeted test-only suppression for expected negative-path logs.
- Keep test assertions and runtime behavior unchanged.
- Add `withMutedExpectedErrorLogs` helper in API test helpers and apply it only to explicitly expected noisy negative paths.
- Keep management-api logging unchanged for this scope (plan covers API tests only).

#### Files Modified

- apps/api/src/test/helpers/index.ts
- apps/api/src/test/auth.test.ts
- apps/api/src/test/external-services-and-meta.test.ts
- apps/api/src/test/paypal.test.ts
- apps/api/src/test/account.test.ts
- apps/api/src/test/playlist.test.ts
- apps/api/src/test/account-follows-notifications.test.ts
- .llm/history/active/reduce-expected-test-error-noise/reduce-expected-test-error-noise-part-01.md
