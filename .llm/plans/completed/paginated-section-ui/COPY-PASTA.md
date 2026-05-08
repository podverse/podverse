# Paginated section → shared UI — copy-pasta checklist

- [x] `01-paginated-section-ui.md`

Plan set is **complete**; files live under `.llm/plans/completed/paginated-section-ui/`.

## Prompt block (verbatim)

Execute **Paginated section → `@podverse/ui`**: implement `PaginatedSection` in `packages/ui` composing
`PaginationStrip` (column layout, children, hide controls when `totalPages <= 1`, required aria label
props, optional `maxButtons` default 5, export from `packages/ui/src/index.ts`). Refactor
`apps/web/src/components/Pagination/Pagination.tsx` to call `useTranslations('pagination')` and pass
strings into `PaginatedSection`; keep `setPage` prop at the web boundary mapping to `onPageChange`.
Remove orphaned web `Pagination.module.scss` and `apps/web/src/constants/pagination.ts` if unused. Add
Vitest for `PaginatedSection`. Run `./scripts/nix/with-env npm run build:packages`,
`./scripts/nix/with-env npm run lint`, and optional scoped web E2E. Update `.llm/history/active/`.
