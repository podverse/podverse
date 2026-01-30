# Workers Env Validation — Remaining Work

**Context**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md) |
[workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Status

| Plan   | Description                                          | Status              |
| ------ | ---------------------------------------------------- | ------------------- |
| 01     | Command-first and per-job validation                 | **Complete**        |
| 02     | Config/lazy context (categories, getters, index)     | **Complete**        |
| 04     | Workers skill                                        | **Complete**        |
| 03     | Documentation (ENV.md, APPS-WORKERS.md, JSDoc, etc.) | **Complete**        |
| **05** | **Tests for per-job validation**                     | **Not implemented** |

Plans 01, 02, 03, 04 are implemented. Plan 05 (tests) was never added. Until Plan 05 is
implemented, the workers-env-validation folder should remain in `active/`. After Plan 05 is
done, move the entire `workers-env-validation` directory to `.llm/plans/completed/`.

## What’s missing: Plan 05 (Tests)

- **Location**: [workers-env-05-tests.md](workers-env-05-tests.md)
- **Gap**: No test file or test script for workers. `apps/workers` has no `test` script in
  `package.json`, no `*.test.ts` files, and no `__tests__/` directory.
- **Required** (from Plan 05):
  1. **Unknown command**: `validateStartupRequirements('unknownCommand')` throws with a clear
     error (e.g. message contains "Unknown command" or "FATAL").
  2. **Known command returns only that command’s vars**: For a known command (e.g.
     `statsUpdateAggregated`), validation results include only Base + ORM vars; no MQ or
     PodcastIndex vars. (Test via a helper that returns `ValidationResult[]` for a command, or
     by asserting on thrown message / env when a required var is missing.)
  3. **Required missing**: For a command that requires e.g. USER_AGENT, when USER_AGENT is
     unset, validation throws with a message containing "FATAL" and the required count. Use
     env save/restore or mock so other tests are not affected.
  4. **All required set**: When all required env vars for that command are set (in test),
     `validateStartupRequirements(commandName)` does not throw.

## Implementation steps (to complete Plan 05)

1. **Add test runner to apps/workers**
   - Add Jest (or the monorepo’s existing test runner) to `apps/workers`: `package.json` scripts
     and config (e.g. `jest.config.js` or use root config). Ensure `npm run test -w apps/workers`
     runs worker tests only.

2. **Expose testable validation entry (optional but useful)**
   - Either export a function that returns `ValidationResult[]` (or summary) for a given
     command name without calling `displayValidationResults` or throwing (e.g.
     `getValidationResultsForCommand` or `runValidationForCommand`), or test only
     `validateStartupRequirements` with env mocks and assert on throw / no throw and error
     message. Plan 05 allows testing behavior (throw with "FATAL" and count) rather than
     console output.

3. **Create test file**
   - Place tests next to validation, e.g. `apps/workers/src/lib/startup/validation.test.ts` or
     `apps/workers/src/lib/startup/__tests__/validation.test.ts`.

4. **Implement the four required test cases**
   - Unknown command throws.
   - Known command (e.g. `statsUpdateAggregated`) yields only that command’s categories (e.g.
     Base + ORM; no MQ/PI in results). If the only exported API is `validateStartupRequirements`,
     you can assert by unsetting a MQ-only var and confirming that `statsUpdateAggregated` still
     passes when Base+ORM are set; and that a command that needs MQ fails with the right
     message when MQ is missing.
   - Required var unset → throw with "FATAL" and required count (env save/restore).
   - All required set → no throw.

5. **Run and fix**
   - `npm run test -w apps/workers` (or equivalent); fix any failures.

6. **Move to completed**
   - After all tests pass and lint/build pass, move
     `.llm/plans/active/workers-env-validation/` to
     `.llm/plans/completed/workers-env-validation/` (preserving all plan files).

## Verification (after Plan 05)

```bash
npm run build:packages
npm run build -w apps/workers
npm run test -w apps/workers
npm run lint
```
