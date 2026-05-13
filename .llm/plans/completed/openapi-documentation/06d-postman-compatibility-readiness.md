# 06d: Postman Compatibility Readiness Subplan

## Goal
Ensure both OpenAPI specs import cleanly into Postman and are executable as collections without manual cleanup.

## Compatibility Checklist
1. Spec-level requirements
- OpenAPI version explicitly `3.0.3`
- stable `info.title` and `info.version`
- valid `servers` with correct base path (`/api/v2`)

2. Operation-level requirements
- unique `operationId` values
- clear tags for folder grouping
- explicit `requestBody.content` types
- complete parameter schemas (path/query/header/cookie)

3. Auth mapping
- bearer auth represented with standard HTTP bearer scheme
- cookie auth represented clearly where required
- no ambiguous mixed auth docs without explanation

4. Schema compatibility
- avoid ambiguous nullable/oneOf patterns unless necessary and tested
- include concrete examples for complex payloads
- ensure enums and formats are valid and consistent

5. Execution usability
- example bodies runnable without hidden fields
- response examples match documented schemas
- error responses documented for common failure paths

## Validation Steps
- import each spec into Postman
- generate collection and inspect folder structure
- run sample requests per major tag
- verify auth helper setup works with defined security schemes

## Exit Criteria
- both specs import with no blocking errors
- generated collections are organized and runnable
- auth and request examples are usable for smoke testing
