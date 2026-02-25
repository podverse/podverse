# Subplan 01 - Runtime Config Contract

## Objective

Define the runtime-config payload shape for both apps and map every
`NEXT_PUBLIC_*` use to a runtime key.

## Tasks

1. Inventory all `NEXT_PUBLIC_*` usage for apps/web and apps/management-web.
2. Define a runtime-config schema for each app (keys, types, defaults).
3. Identify any build-time-only values and document exceptions (aim for none).
4. Add a single source of truth for runtime-config keys used by:
   - Server endpoint response
   - Client config loader
   - Validation rules

## Target Files (expected)

- `apps/web/src/config/index.ts`
- `apps/management-web/src/config/index.ts`
- `apps/web/src/constants/web.ts`
- `apps/web/src/i18n/request.ts`
- `apps/management-web/src/i18n/request.ts`
- `apps/web/src/utils/localSettings/uiTheme.ts`

## Notes

- Prefer type-safe definitions without `as` assertions.
- Keep keys aligned with existing env names to reduce migration risk.
