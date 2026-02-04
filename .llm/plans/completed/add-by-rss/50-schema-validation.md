# Add by RSS - Schema Validation (Overview)

## Goal

Ensure parsed Add by RSS data matches existing data schemas expected by the web app, and
discard invalid data to prevent UI breakage.

## Scope

- Validation of parsed payloads against existing DTO/schema expectations.
- Error handling and discard policy.

## Key Files

- Helpers DTOs/validators:
  [packages/helpers/src/](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/)
- Parser output shapes:
  [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)
- Web app consumers:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Subplans

- Validation target inventory:
  [51-schema-validation-targets.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/51-schema-validation-targets.md)
- Validator approach:
  [52-schema-validation-approach.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/52-schema-validation-approach.md)
- Failure handling and discard policy:
  [53-schema-validation-failure-policy.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/53-schema-validation-failure-policy.md)

## Decisions to Make Later

- Whether to reuse existing validator modules or create Add by RSS-specific validators.
