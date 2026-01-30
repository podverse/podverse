# Workers Env Validation — Plan 05: Tests for per-job validation

**Phase**: 3B (run in parallel with Plan 03 — documentation)  
**Depends on**: Phase 2 complete (per-job validation and lazy config/context in place)  
**Summary**: [workers-env-00-SUMMARY.md](workers-env-00-SUMMARY.md)  
**Execution order**: [workers-env-00-EXECUTION-ORDER.md](workers-env-00-EXECUTION-ORDER.md)

## Objective

Add or adjust tests for per-job env validation in the workers app. Cover: required vars per command (each command’s validator only validates its vars); unknown command fails fast; validation output shape (summary, requiredMissing) where appropriate.

## Scope

- **Unit tests** for validation logic: given a command name, the validator returns only the ValidationResult[] for that command; required missing is computed correctly; unknown command is rejected (throw or explicit failure).
- **Display/output**: Optionally test that displayValidationResults produces the expected structure (categories, summary fields) or that validateStartupRequirements throws with the expected message when required vars are missing. Prefer testing behavior (e.g. throw with "FATAL" and required count) rather than console output.
- **No E2E** required for this plan: no need to spawn the full worker process; focus on validator and validation entry.

## Files to create or modify

### 1. Test file location

**Options**:

- `apps/workers/src/lib/startup/validation/__tests__/validation.test.ts` (if validators live under `validation/`).
- `apps/workers/src/lib/startup/__tests__/validation.test.ts` (if validation stays in a single file or one entry + validators in same dir).

Place tests next to or under the validation module so they run with the workers app test script (e.g. `npm run test -w apps/workers` or `jest` for apps/workers).

### 2. Test cases

**Required**:

1. **Unknown command**: Calling `validateStartupRequirements('unknownCommand')` (or the internal validator lookup) throws or exits with a clear error; no validation results for all vars. If the API is "getValidationResultsForCommand(name)" and unknown returns empty or throws, test that unknown command is rejected before running display/throw.
2. **Known command returns only that command’s vars**: For a known command (e.g. `statsUpdateAggregated`), the validator returns ValidationResult[] that includes only the vars required/optional for that command (e.g. Base + ORM). No MQ or PodcastIndex vars in the results. Assert result count or result names match the expected set for that command.
3. **Required missing**: For a command that requires e.g. USER_AGENT, when USER_AGENT is unset, the validation summary has `requiredMissing > 0` and the validator (or validateStartupRequirements) throws with a message containing "FATAL" and the count. Use a test that temporarily unsets the var (or mock process.env) and then restores it.
4. **All required set**: For a command, when all required env vars for that command are set (mock or set in test), validation summary has `requiredMissing === 0` and validateStartupRequirements does not throw.

**Optional**:

- **Display shape**: Assert that the summary object has the expected shape (total, passed, failed, requiredMissing, skipped, defaultsUsed, results).
- **Optional vars**: For a command with optional vars, when optional vars are unset, validation still passes (requiredMissing === 0).

### 3. Test setup

- Use Jest (or the test runner already used by apps/workers). Check `apps/workers/package.json` for test script and Jest config.
- For tests that depend on process.env, save and restore env around the test so other tests are not affected. Example: `const saved = process.env.USER_AGENT; process.env.USER_AGENT = ''; ... validate...; process.env.USER_AGENT = saved;`
- If validation entry throws on unknown command, test that the thrown error message contains "unknown" or "Unknown command" (or the exact message you use).

### 4. Implementation steps

1. Confirm test runner and location (e.g. Jest, `apps/workers/src/**/*.test.ts`).
2. Create the test file next to or under the validation module.
3. Implement tests for: unknown command fails; known command returns only that command’s vars; required missing causes throw with FATAL; all required set passes.
4. Use env save/restore (or mock) for tests that unset vars; avoid polluting process.env for other tests.
5. Run tests: `npm run test -w apps/workers` (or equivalent). Fix any failures.

## Verification

```bash
npm run build:packages
npm run build -w apps/workers
npm run test -w apps/workers
npm run lint
```

- All new or updated tests pass.
- No flakiness from shared process.env; each test that mutates env restores it.

## Out of scope for this plan

- E2E tests that run the full worker process (e.g. `node index.js statsUpdateAggregated`).
- Testing config getters or lazy context creation (those can be covered in a separate test plan if desired).
- Documentation (Plan 03).
