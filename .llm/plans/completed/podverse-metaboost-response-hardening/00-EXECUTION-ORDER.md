# Execution Order

1. `01-post-flow-correctness.md`
2. `02-error-contract-mapping.md`
3. `03-capability-parse-and-fallback-policy.md`
4. `04-tests-and-verification.md`

## Notes

- Execute in order because later phases assume deterministic post-flow outcomes from phase 1.
- Keep each phase in its own commit if you want easy rollback/cherry-pick.
- Do not move plan files to `completed/` until implementation for that phase is actually done.
