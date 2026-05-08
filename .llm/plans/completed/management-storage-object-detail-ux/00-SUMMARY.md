# Management Web — Storage Object Detail UX

## Outcome

Improve the object-storage **Object details** page (`/storage/[key]`): clearer spacing and alignment for
Download / Delete / Back, **danger** styling for destructive actions, and a **loading spinner** on the
async delete confirmation using `@podverse/ui` `Button` `isLoading`.

## Scope

- **Single app file:** [`apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx)
- **No API, schema, or i18n key changes** required for the baseline implementation (reuse existing
  `storage` namespace strings).

## Non-Goals

- Extending `ActionLink` to support the `download` attribute (keep plain `<a download>`).
- Adding spinners for `getCurrentUser` bootstrap or download clicks.

## Verification

- Lint the touched file.
- Optional: scoped management-web E2E if you change selectors asserted elsewhere (default list spec
  unlikely to need updates).
