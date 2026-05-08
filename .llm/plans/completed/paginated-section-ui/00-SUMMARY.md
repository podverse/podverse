# Paginated section → `@podverse/ui`

Extract the web list pagination shell (children + column layout + conditional `PaginationStrip`) into a new copy-free primitive in `packages/ui`, and keep a thin `apps/web` `Pagination` wrapper for `next-intl` aria labels. Does not merge the existing management-style `Pagination` component with the strip-based pattern.

**Execute:** [`01-paginated-section-ui.md`](./01-paginated-section-ui.md) (see [`00-EXECUTION-ORDER.md`](./00-EXECUTION-ORDER.md)).
