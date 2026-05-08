# Phase 02 — Metaboost: SCSS

## Scope

Remove `var()` fallback arguments from Metaboost app module SCSS. `--color-border` is defined in
`packages/ui/src/styles/_themes.scss`; dropping the hex fallback is sufficient.

## Key files (Metaboost repo)

- `apps/web/src/app/(main)/bucket/[id]/BucketRolesClient.module.scss`
- `apps/management-web/src/app/(main)/bucket/[id]/settings/BucketRolesClient.module.scss`
- `apps/management-web/src/components/buckets/BucketMessagesClient.module.scss`

## Steps

1. In each file, change `var(--color-border, #eee)` to `var(--color-border)`.

## Optional follow-up

- `packages/ui/src/components/navigation/Dropdown/CaretMenuDropdown.stories.tsx`: replace inline
  `var(--color-border, #555)` with `var(--color-border)` for consistency.

## Verification

- From Metaboost repo root: `rg 'var\([^)]+,' --glob '*.scss'` → no matches.
- Quick UI check: bucket roles and messages sections show expected borders under light/dark themes.
