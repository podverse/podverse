# Subplan 06 - Documentation Updates

## Objective

Update env documentation to reflect sidecar-based runtime config and runtime
deployment requirements.

## Tasks

1. Update web and management-web ENV docs to describe sidecar runtime config flow.
2. Align env templates to indicate deploy-time `.env.production` requirements.
3. Add a short note about internal-only sidecar and server-side bootstrap.

## Target Files (expected)

- `apps/web/ENV.md`
- `apps/management-web/ENV.md`
- `infra/config/env-templates/web.env.example`

## Notes

- Keep docs consistent with validation and runtime behavior.
