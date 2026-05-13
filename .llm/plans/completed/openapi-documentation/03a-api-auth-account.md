# 03a: Public API Auth and Account Subplan

## Scope
- `/auth/*`
- `/account/*`
- `/account-settings/*`

## Documentation Requirements
- Explicit auth mode per operation.
- Distinguish session cookie behavior from bearer token behavior.
- Document 400/401/403 differences clearly.
- Include request body constraints for login/token flows.

## Operation Quality Gates
Each operation must include:
- `summary`, `description`, `operationId`, `tags`
- `security` block
- request schema + examples
- success and failure responses

## Edge Cases to Capture
- invalid credentials vs unverified account
- token refresh invalid/expired token
- authenticated endpoint with missing cookie/token

## Exit Criteria
- All auth/account operations documented with complete schema coverage.
- No ambiguous auth semantics remain.
