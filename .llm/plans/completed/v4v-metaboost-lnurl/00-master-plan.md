# MetaBoost + LNURL V4V Master Plan

## Goal

Deliver a complete, end-to-end implementation for LNURL-based V4V boosts with `<podcast:metaBoost>`
support, BoostBox integration (localhost), and Alby Sandbox-based testing. Support both core and
add-by-RSS flows, and ensure metaBoost is preferred when present but optional when absent.

## Repositories in Scope

- Podverse monorepo: `/Users/mitcheldowney/repos/pv/podverse`
- Partytime parser: `/Users/mitcheldowney/repos/pv/partytime`

## Key Requirements (from prompt)

- Add `<podcast:metaBoost>` parsing in partytime.
- metaBoost schema attribute must exist and only allow `"boostbox"` for now.
- Prepare for future payment services (Alby is only the first).
- Use BoostBox if metaBoost exists; otherwise fallback to existing V4V flow.
- Create `@podverse/external-services-alby`.
- Create `@podverse/helpers-v4v-metadata`.
- Update DB schema, ORM, DTOs, endpoints, and web UI.
- Keep add-by-RSS components in parity.
- Add documentation and testing assets, including metaBoost tags.

## Plan Breakdown

Each subplan is designed to be executed independently and safely.

1. **Partytime parsing** → `01-partytime-metaboost.md`
2. **Helpers package** → `02-helpers-v4v-metadata.md`
3. **Alby integration** → `03-external-services-alby.md`
4. **ORM & migrations** → `04-orm-schema-migrations.md`
5. **Parser mapping** → `05-parser-mapping-ingest.md`
6. **API + DTOs** → `06-api-endpoints-dtos.md`
7. **Web UI (core)** → `07-web-ui-core.md`
8. **Web UI (add-by-RSS)** → `08-web-ui-add-by-rss.md`
9. **Docs / local setup** → `09-docs-local-setup.md`
10. **Test assets + seeding** → `10-test-assets-seeding.md`

## Execution Order

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

## Constraints and Conventions

- No `any` types.
- Avoid type assertions (`as`); use guards and narrowing.
- ESM imports with `.js` extensions in relative paths.
- Use `import type` for type-only imports.
- Respect add-by-RSS parity rules for UI changes.
- Documentation formatting rules: 100-char line width, aligned tables, blank lines around lists.
- Tests are **not required** unless explicitly requested.

## Dependencies Between Subplans

- Partytime parsing (01) should land before parser mapping (05).
- Helpers (02) should land before ORM/DTOs/API/UI (04–07).
- Alby package (03) can be parallel with helpers, but used by API/UI later.
- ORM + migrations (04) should precede API/DTOs (06) and UI (07–08).

