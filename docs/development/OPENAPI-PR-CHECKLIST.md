# OpenAPI PR Checklist

Use this checklist whenever API behavior is changed.

## Required

- [ ] Updated `apps/api/openapi.yml` and/or `apps/management-api/openapi.yml` for all route-level changes
- [ ] Both route locations were considered when applicable (`apps/api/src/routes/` and `apps/management-api/src/routes/`)
- [ ] Every operation has a unique `operationId`
- [ ] Auth/security is explicit (`security: []` for public endpoints)
- [ ] Request and response schemas reflect current validators/controllers
- [ ] 401 vs 403 semantics are documented for protected endpoints

## Quality

- [ ] Mutating endpoints include success + failure examples
- [ ] Path parameters and query parameters are fully documented
- [ ] No unresolved references or invalid schema constructs

## Compatibility

- [ ] Swagger UI docs load at `/api/v2/docs` for changed API
- [ ] Postman import sanity check passes for changed spec

## Route Parity Reviewer Checks

- [ ] Every changed route method+path has a matching OpenAPI path+method
- [ ] Every changed route maps to a stable `operationId`
- [ ] Changed validator constraints are reflected in schema fields/enums/required lists
- [ ] If no spec edit was made for a route change, PR includes explicit justification

## Required Evidence In PR Description

Paste these items when a PR changes route behavior, auth semantics, or request/response contracts:

- [ ] `./scripts/nix/with-env npm run openapi:check` result
- [ ] Changed route parity mapping (source route -> OpenAPI path/method -> operationId)
- [ ] Auth behavior notes for changed protected endpoints (401 vs 403)

## Merge Blocker Policy

- [ ] PR must not be approved/merged until all applicable required evidence items are present
- [ ] If route behavior changed without spec edits, explicit justification must be present in the PR description
