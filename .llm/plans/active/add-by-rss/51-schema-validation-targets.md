# Add by RSS - Validation Target Inventory

## Goal

Identify the existing DTOs and schemas used by the web app for podcast/episode/etc. so Add by
RSS payloads can align with them.

## Scope

- Inventory of DTOs and schema validators.
- Mapping of Add by RSS payload shapes to existing structures.

## Key Files

- Helpers DTOs/validators:
  [packages/helpers/src/](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/)
- Web app consumers:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Plan

1. List DTOs and schema validators used for standard content responses.
2. Map which fields are required by the web app for each resource type.
3. Document the minimum Add by RSS payloads required for parity.
