# 01 — Device matrix + track scope docs (18.1, 18.15)

**Detail docs:** [510-device-matrix-doc](/docs/proposals/mobile/_master-plan_/phase-1/details/510-device-matrix-doc.md),
[535-device-track-scope-matrix](/docs/proposals/mobile/_master-plan_/phase-1/details/535-device-track-scope-matrix.md)
**Model:** Auto

## Goal

Two documentation deliverables that anchor the rest of Track 18. Docs only — no app code.

## Tasks

1. Create `docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md` with:
   - The **device matrix** table from detail 510 (phone / tablet / Wear OS / Apple Watch /
     Android TV / tvOS) — v1 status, input, process/data source.
   - The **device/track scope matrix** table from detail 535 (subsystem × device target).
   - A note that tablets share phone SQLite repositories and watches consume MediaSession / native
     cache only, linking
     [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
2. Add a short "Device matrix" pointer in [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) linking the
   new doc.
3. Follow **documentation-conventions** and repo markdown formatting (100-col, aligned tables,
   repo-root `/`-prefixed cross-tree links).

## Acceptance

- New doc exists with both tables; APPS-MOBILE.md links it.
- Set detail headers 510 and 535 to `**Status:** done` when finished.

## Do not

- Do not write app/native code in this plan.
- Do not run tests during agent work.
