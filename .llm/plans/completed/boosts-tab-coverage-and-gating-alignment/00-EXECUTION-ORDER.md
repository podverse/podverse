# Boosts Tab Coverage And Gating Alignment - 00 Execution Order

## Critical Execution Rules
- Run phases in order; do not skip ahead.
- Each phase is designed to be runnable as a standalone unit.
- Stop after each phase and verify behavior before proceeding.

## Phase 1 - Shared Eligibility Foundation
1. Execute `01-shared-eligibility-foundation.md`.
2. Ensure the new shared eligibility API is the only source of truth for:
   - `canShowBoostAction`
   - `canShowBoostMessagesTab`

Why first:
- Prevents duplicated gating logic across page clients, lists, and header entry points.

## Phase 2 - Podcast/Episode Tab Gating Alignment
1. Execute `02-podcast-episode-gating-and-fetcher-alignment.md`.
2. Confirm podcast/episode `ssrCanShowBoosts` and messages fetcher guards both use shared eligibility.

Why second:
- Podcast/episode are the only current routes with Boosts tabs and must remain canonical.

## Phase 3 - Boost Action Visibility Alignment
1. Execute `03-header-boost-action-alignment.md`.
2. Execute `04-add-by-rss-boost-action-alignment.md`.
3. Verify boost buttons only render when shared eligibility allows them.

Why third:
- Aligns modal-entry behavior to the same policy as tab visibility.

## Phase 4 - Reuse/DRY Hardening
1. Execute `05-reuse-opportunities-and-dry-hardening.md`.
2. Decide whether to keep utility-only or add an optional reusable hook wrapper.

Why fourth:
- Consolidates consistency improvements after core functional alignment is complete.

## Phase 5 - Non-Podcast Surface Decision Record
1. Execute `06-non-podcast-surface-evaluation.md`.
2. Keep unsupported surfaces explicitly documented until query-param + scoped fetch support exists.

## Phase 6 - Verification
1. Execute `07-validation-and-manual-checklist.md`.
2. Run lint and manual checks; capture findings and follow-ups.

## Suggested Run Command Checklist (from monorepo root)
```bash
npm run lint -w @podverse/web -- --max-warnings 0
```

Targeted lint alternative:
```bash
npx eslint "apps/web/src/**/FILE.tsx" --max-warnings 0
```
