# Phase 1 — Breadcrumbs + key-value layouts (Shared UI consolidation)

## Preconditions

- Phase 0 inventory exists and names these extractions as **high ROI**.

## Goal

Remove repeated **breadcrumb** and **key-value / description list** CSS and JSX from
`apps/management-web` by implementing shared components in `packages/ui`.

## Design constraints

- **Next.js `Link`**: Avoid hard-coding `next/link` inside `packages/ui` if that creates an awkward
  dependency from the package to Next. Prefer one of:
  - **Composition**: export styled wrappers + list markup; callers pass `<Link href>` children, or
  - **Render props / slots**: segments as `ReactNode`.
- Use `@podverse/ui` design tokens and existing mixins; no token duplication in apps.
- Match accessibility: nav landmark or `aria-label` on breadcrumb trail if appropriate.

## Implementation sketch

1. Add component(s), e.g. `Breadcrumbs` + `BreadcrumbSegment`, and `DescriptionList` /
   `KeyValueList` (pick final names to match inventory).
2. Co-locate `*.module.scss` under `packages/ui/src/components/...`.
3. Export types and components from `packages/ui/src/index.ts`.
4. Migrate management-web pages identified in Phase 0:
   - Replace duplicated `.breadcrumbs` blocks and delete redundant rules from page modules.
   - Replace `.dl` / `.valueRow` patterns with the shared component API.

## Files likely touched (adjust per inventory)

- `packages/ui/src/components/**` (new)
- `packages/ui/src/index.ts`
- Multiple `apps/management-web/src/app/**/page.module.scss` and `*PageClient.tsx`

## Verification

- `npm run lint` (repo root) and type-check as usual.
- Management-web E2E: run **scoped** Playwright report targets for touched flows per
  **response-ending-make-verify** / **e2e-run-with-make-only** rules, for example:

```bash
make e2e_test_management_web_report_spec SPEC=e2e/products-hub.spec.ts
```

(Add or adjust `SPEC=` to match pages migrated in this phase.)

## Completion

Update `COPY-PASTA.md`, then move this file to `.llm/plans/completed/shared-ui-consolidation/` when
done (per plan lifecycle rules).
