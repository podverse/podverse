# Boosts Non-Podcast Tab Expansion - 00 Execution Order

## Scope
- Artist detail page
- Album detail page
- Track detail page
- Livestream detail page
- Videos surface (determine whether list-only or detail support path exists)

## Execution Order
1. Run `01-surface-inventory-and-type-contracts.md`.
2. Run `02-messages-fetcher-scope-extension.md`.
3. Run `03-route-tab-and-list-integration.md`.
4. Run `04-refresh-and-gating-consistency.md`.
5. Run `05-validation-matrix.md`.
6. If all pass, move this plan set to `.llm/plans/completed/`.

## Rule
- Do not expose a Boosts tab on a surface until both conditions are true:
  - Query-param/tab contract supports `boosts`.
  - Public messages fetcher can be built for that surface.
