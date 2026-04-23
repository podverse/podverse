# Phase 01 - Test Foundation and Standards

## Purpose

Establish shared rules so added tests stay high value, fast, and maintainable.

## Standards

- Prefer table-driven tests for pure logic.
- Prefer behavior contracts over implementation details.
- Mock only hard boundaries (time, randomness, network, DB, framework runtime).
- Keep one test focused on one user-relevant behavior.
- Avoid snapshot-heavy approaches for this effort.

## Confident-vs-Bulletproof Guardrails

- Cover key happy path plus major failure paths.
- Cover high-risk boundaries (empty, invalid, max/min, stale window, rounding).
- Do not brute-force every permutation unless risk justifies it.
- Stop adding cases when additional cases do not protect meaningful business behavior.

## File and Naming Conventions

- Co-locate tests with modules where possible.
- Use `*.test.ts` (`*.test.tsx` for React).
- Use clear `describe` scopes by business behavior.

## Quality Gates

For each phase:

1. Tests compile and run for touched workspaces.
2. No new lint violations in touched files.
3. Assertions verify behavior, not incidental internals.

## Exit Criteria for This Phase

- Standards are reflected in subsequent phase implementations.
- Phase 02 begins with these guardrails applied.
