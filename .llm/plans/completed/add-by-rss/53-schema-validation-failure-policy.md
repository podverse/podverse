# Add by RSS - Validation Failure Policy

## Goal

Define behavior when validation fails so invalid data does not break the UI.

## Scope

- Discard policy for invalid payloads.
- Client hash update/removal rules.
- Error reporting to clients.

## Key Files

- API response handling:
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- Web app consumers:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Plan

1. On validation failure, discard payload and return failure status.
2. Ensure client removes or updates any stored hash when payload is rejected.
3. Provide error metadata suitable for UI display and logging.
