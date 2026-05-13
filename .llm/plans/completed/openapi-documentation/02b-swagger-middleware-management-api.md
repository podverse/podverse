# 02b: Swagger Middleware Plan — Management API

## Goal
Define Swagger docs serving for management API with same usability model as public API.

## Endpoints to Serve
- `/api/v2/docs`
- `/api/v2/docs.json`
- `/api/v2/docs.yaml` (optional)

## Middleware Plan
1. Load `apps/management-api/openapi.yml`.
2. Mount docs routes after core API route mounting.
3. Ensure docs route availability during local development.
4. Verify server list includes both local and production management URLs.

## Quality Checks
- docs path does not conflict with management routes
- spec load errors are explicit and actionable
- docs route usable without side effects

## Exit Criteria
- `dev:management-api` serves docs UI and raw JSON.
- Swagger editor import path works from local endpoint.
