# Subplan 03 - Validation Updates

## Objective

Shift `NEXT_PUBLIC_*` validation from build-time to runtime and keep lighthouse
env alignment intact. Runtime validation will live in the **sidecar**.

## Tasks

1. Update `validate-env.ts` scripts to only require server-only build vars.
2. Add runtime validation in the sidecar before serving config.
3. Keep lighthouse env example aligned with runtime-config expectations.
4. Update any references that assume build-time validation of public vars.

## Target Files (expected)

- `apps/web/scripts/validate-env.ts`
- `apps/management-web/scripts/validate-env.ts`
- `tools/web-perf/lighthouse/.env.web.example`

## Notes

- Avoid introducing defaults in config files; keep fail-fast validation.
- Ensure runtime validation errors are explicit and actionable.
- Require explicit env values (no silent fallbacks) before running apps.
- Treat optional vars according to existing validation logic; derive optionality
  from current validation rules rather than ad hoc changes.
