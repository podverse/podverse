# OpenAPI PR Checklist

Use this checklist whenever API behavior is changed.

## Required

- [ ] Updated `apps/api/openapi.yml` and/or `apps/management-api/openapi.yml` for all route-level changes
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
