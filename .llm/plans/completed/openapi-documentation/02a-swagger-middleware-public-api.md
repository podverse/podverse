# 02a: Swagger Middleware Plan — Public API

## Goal
Define how public API OpenAPI docs are served as human-readable Swagger UI and raw specs.

## Endpoints to Serve
- `/api/v2/docs` (interactive UI)
- `/api/v2/docs.json` (raw JSON)
- `/api/v2/docs.yaml` (raw YAML, optional)

## Middleware Plan
1. Load `apps/api/openapi.yml` safely at startup.
2. Expose UI and raw spec endpoints.
3. Include startup log line confirming docs route availability.
4. Ensure no auth required to view docs route unless policy changes.

## Quality Checks
- docs endpoint does not shadow business endpoints
- invalid spec load fails fast with clear message
- local server list includes `http://localhost:3000/api/v2`
- production server list includes canonical production URL

## Exit Criteria
- `dev:api` serves docs UI successfully.
- JSON endpoint can be consumed by validator/editor tools.
