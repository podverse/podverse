# Phase 03 - management-api secret response sanitization

Prevent secret config fields from leaking in update responses.

## Problem

- GET routes sanitize secret-marked fields.
- PUT /extensions/:id currently returns the raw saved row, which can include secret fields.

## Required changes

- Update apps/management-api/src/routes/extensions.ts:
  - Replace raw PUT response payload with a sanitized extension detail response shape consistent with GET /extensions/:id semantics.
  - Preserve status code and error behavior.
- Reuse existing sanitize helper logic where possible.
- Update integration tests in apps/management-api/src/routes/extensions.integration.test.ts:
  - Add or adjust an assertion that PUT response omits secret fields.

## Validation

Run:

```bash
./scripts/nix/with-env npm run test -w apps/management-api -- extensions.integration.test.ts
./scripts/nix/with-env npm run build -w apps/management-api
```

## Exit criteria

- No secret fields are present in PUT response payload.
- Existing route contract remains stable for non-secret fields.
