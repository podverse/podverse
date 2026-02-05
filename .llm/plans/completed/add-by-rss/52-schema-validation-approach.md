# Add by RSS - Validation Approach

## Goal

Choose a validation strategy that ensures Add by RSS payloads match expected schemas without
duplicating excessive logic.

## Scope

- Reuse vs. derive validators.
- Alignment of parser output to validators.

## Key Files

- Helpers DTOs/validators:
  [packages/helpers/src/](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/)
- Parser output shapes:
  [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)

## Plan

1. Evaluate existing validator modules for direct reuse.
2. If reuse is not possible, define Add by RSS-specific validators that align with web app
   expectations.
3. Ensure parser output is normalized to the validator’s required shape.
