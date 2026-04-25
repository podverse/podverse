---
name: e2e-url-state-contracts
description: Enforces URL-state contract tests for sortable/filterable pages in Playwright. Use when pages support search, sort, filters, pagination, or tab query params.
version: 1.0.0
---


# E2E URL State Contracts

Current E2E bar: **Confident**. Use this skill for pages with query-param state.

## Contract checklist

- [ ] Supports expected params (`search`, `sortBy`, `sortOrder`, `page`, `tab`, etc.).
- [ ] Preserves explicit params on load.
- [ ] Applies canonicalization rules consistently.
- [ ] Back/forward navigation keeps state aligned with URL.
- [ ] Defaults are not redundantly forced into URL unless required.

## Assertion guidance

- Parse `new URL(page.url())` and assert pathname + relevant params exactly.
- Assert visible table/list state that corresponds to URL state.
- For canonicalized routes, assert accepted patterns explicitly.

## Completion checklist

- [ ] At least one query-param contract test per modified sortable/filterable surface.
- [ ] Contract tests included in targeted and full E2E runs.
