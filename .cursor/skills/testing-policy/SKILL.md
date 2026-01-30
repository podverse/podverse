---
name: podverse-testing-policy
description: Skip test implementation unless the user explicitly asks. Use when a plan or task
  includes adding unit tests, a test phase, or "Phase 3: Tests".
version: 1.0.0
---

# Testing policy — skip tests for now

## When to use

- When a plan or task includes adding unit tests, a test phase, or "Phase 3: Tests".
- When deciding whether to implement tests for a feature.

## Rules

1. **We are not concerning ourselves with tests at this time.** Skip test implementation steps in
   plans unless the user explicitly asks for tests.

2. Prefer: lint, build, manual verification. Do not add Jest/vitest or new test files unless the
   user explicitly requests tests.

3. If a plan has a "Phase 3: Tests" or "add unit tests" step, skip that step (or mark it
   deferred) and consider the plan complete for the other phases. Do not block plan completion
   on test implementation.

## References

- [AGENTS.md](../../AGENTS.md) — "Testing and Verification" (lint, build, app starts, manual
  verification)
