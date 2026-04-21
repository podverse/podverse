---
name: unit-test-design-no-overgranularity
description: Keep tests behavior-focused and avoid low-value complexity. Use when writing or reviewing unit tests.
version: 1.0.0
---

# Unit Test Design - No Overgranularity

## Core Rule

Test behavior contracts and business invariants, not implementation trivia.

## Prefer

- Table-driven cases for deterministic logic
- Public API behavior over private internals
- Stable inputs/outputs with explicit assertions
- Minimal mocks at system boundaries (time, network, DB, environment)

## Avoid

- Snapshot-heavy test suites for logic modules
- Tests that only mirror implementation line-by-line
- Huge combinatorial matrices with little incremental signal
- Framework/library behavior tests that do not validate Podverse logic

## Practical Depth Limits

- Cover one happy path + key failure path + boundary path first
- Add cases only when each new case guards a distinct regression risk
- Stop when additional tests mostly duplicate existing signal

## Determinism

- Freeze time when needed
- Avoid random data without fixed seeds
- Keep tests fast so developers run them frequently
