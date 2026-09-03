# 10 — Home row metadata

**Cursor model:** Codex 5.3
**Reasoning:** medium
**Detail:** [707-home-row-metadata](/docs/proposals/mobile/_master-plan_/phase-2/details/707-home-row-metadata.md)
**Master step:** P2.1.1
**Depends on:** 07, 08

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 13–14 before starting.

## Goal

Bring the subscribed podcast row to the previous generation's information density, reading entirely
from local storage.

## Work

1. Extend `apps/mobile/src/screens/home/HomeFeedRow.tsx` (and the shared row components it uses) with
   four elements:
   - **`Latest episode: <date>`** — the channel's latest item publish date.
   - **Unseen count badge** — derived from the last-seen timestamp in prompt 07; renders `20+` at the cap and
     is absent at zero.
   - **`N downloaded`** — from the local download index in `downloadsRepository`.
   - **Live badge** — from the channel's live-item status.
2. Every element reads local storage so a fully offline row renders correctly. Where a field is not
   yet stored locally, extend the schema and sync from prompt 06 rather than fetching per row.
3. **Live status dependency:** if the API does not expose live-item status and it cannot be stored
   locally, **stop and raise it with the operator**. Do not invent a client-side approximation.
4. Layout mirrors the previous generation — artwork, latest-episode line, title, download count, and
   the count badge trailing.
5. Colors and badge treatment come from `@podverse/design-tokens` through the active theme. Do not
   sample the legacy palette.
6. Format the date with the app's locale-aware helper per **time-format-local**, not an ad-hoc
   format.
7. Update the downloaded count when a download completes or is deleted.
8. Build from shared components per **mobile-reusable-components**; do not assemble the row from raw
   `View`/`Text`.
9. Extend `apps/mobile/e2e/home.yaml` to assert the row elements against a seeded subscription.

## Constraints

- No hardcoded hex anywhere in the row.
- All copy through i18n, including the `20+` presentation and the download-count label. The unseen
  badge strings go in the **`consumer`** catalog because web reuses them in prompt 13; the
  download-count label is mobile-only and belongs in the mobile overlay.
- **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
  the row reads as **one** item, not five fragments — group it and give it a composed
  `accessibilityLabel` covering title, latest episode date, unseen count, and live state. The live
  badge and the unseen count carry meaning through color and shape, so both need text equivalents.
- Do not run tests during implementation.

## Done when

Rows show the latest-episode date, unseen badge with the `20+` cap, downloaded count, and live badge,
all correct offline and themed with tokens.
