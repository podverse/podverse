# Phase 04 — apps/management-web migration

## Goal

Migrate
[apps/management-web/src/components/ManagementAppLayout/ManagementAppLayout.tsx](../../../../apps/management-web/src/components/ManagementAppLayout/ManagementAppLayout.tsx)
to the composite `NavBar` from `@podverse/ui`.

## Sections

- **`brand`**: Text or styled link to `/dashboard` using config `public.brand.name` (or
  fallback) — same data as today.
- **`accountMenu`**: Recreate behavior of
  [ManagementUserMenu.tsx](../../../../apps/management-web/src/components/ManagementUserMenu/ManagementUserMenu.tsx)
  via `accountMenu.items`: meta row for role, link to settings, logout action. Pass
  localized strings via `next-intl` at the callsite (server or client boundary as required).

**Omit** `backForward`, `search`, and `mobileToggle` — they must not appear.

## Cleanup

- Remove or inline `DashboardNavRight` if redundant.
- Remove `ManagementUserMenu` component file **if** its logic is fully inlined into the
  layout or a minimal local helper that only builds `accountMenu` props.

## i18n

Ensure keys exist in `apps/management-web/i18n/originals/` (and overrides as needed) for
nav labels passed into the composite.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/management-web
```
