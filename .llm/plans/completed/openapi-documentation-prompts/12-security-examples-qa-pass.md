# Prompt 12 Result: Security/Authz + Examples + QA Combined Pass

Objective:
- Define a cross-cutting quality pass for both OpenAPI specs.

## 1) Operation-Level Security Enforcement

Checklist:
- Every protected operation has explicit operation-level security block.
- Public endpoints explicitly set security: [] where global security exists.
- 401 and 403 responses are present and semantically correct.
- Superuser/requireCrud semantics are documented in operation descriptions.

Pass criteria:
- 0 protected operations without security stanza.
- 0 public operations inheriting unintended auth from global security.

## 2) Example Coverage

Checklist:
- Every mutating endpoint has at least one success and one failure example.
- Auth endpoints include credential and token examples.
- Validation-heavy endpoints include invalid-payload examples.
- Webhook/integration endpoints include representative provider payload examples.

Pass criteria:
- >= 1 request and >= 1 response example for each POST/PATCH/DELETE endpoint.

## 3) Structural and Behavioral Validation

Run and capture results for:
- openapi schema lint (spectral or equivalent)
- openapi bundle/parse check
- operationId uniqueness check
- unresolved $ref check
- path param mismatch check

Behavioral checks:
- verify route-to-spec coverage against route matrices
- verify response code sets for auth and mutation endpoints
- verify requestBody content types include application/json where needed

Pass criteria:
- zero errors; warnings triaged and documented.

## 4) Release Readiness Checklist

- Route coverage complete for both APIs
- Security and permission semantics reviewed
- Examples reviewed for realism and no secrets
- Postman import sanity check passes
- Swagger UI renders without errors
- PR checklist + governance docs updated

## Output Artifact Structure Recommendation

When executing the pass, produce a markdown report with:
- Summary table: check, status, notes
- Failure list: exact operationIds and required fixes
- Final go/no-go recommendation
