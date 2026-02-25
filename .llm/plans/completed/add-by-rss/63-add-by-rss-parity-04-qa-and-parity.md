# Add-by-RSS Parity Subplan 04: QA and Parity Checks

## Goals
- Validate visual parity between add-by-RSS and non-add-by-RSS views.
- Document any intentional deviations due to add-by-RSS limitations.

## Scope
- Smoke checks for list and detail views across all target content types.
- Local-only routing behavior validation.
- Fallback title behavior for unparsed channel views.

## Key References
- Add-by-RSS routes/components:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/add-by-rss](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/add-by-rss)
- Add-by-RSS utilities:
  - [/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS)

## Steps
1. For each content type, compare add-by-RSS list view against the non-add-by-RSS list view:
   - Layout structure and spacing.
   - Card/list item layout and typography.
2. For each content type, compare add-by-RSS detail view against the non-add-by-RSS detail view:
   - Title area, metadata blocks, and list sections.
3. Validate supported paths:
   - `/add-by-rss/podcasts`, `/add-by-rss/podcast/:id`
   - `/add-by-rss/artists`, `/add-by-rss/artist/:id`
   - `/add-by-rss/albums`, `/add-by-rss/album/:id`
   - `/add-by-rss/tracks`, `/add-by-rss/track/:id`
   - `/add-by-rss/episodes`, `/add-by-rss/episode/:id`
   - `/add-by-rss/livestreams`, `/add-by-rss/livestream/:id`
4. Validate local-only routing behavior:
   - Confirm that add-by-RSS URLs resolve only when local index values are present.
5. Validate medium-aware rendering:
   - Verify list/detail layouts handle medium-specific fields/formatting.
6. Validate fallback title behavior:
   - For channel views with unparsed data, verify feed URL is shown as title.
7. Record deviations:
   - Document UI differences that are necessary due to missing data or unsupported actions.

## Deliverables
- A short checklist of parity confirmations.
- A list of intentional deviations and why they exist.

## Risks / Open Questions
- Some parity checks might require seed data that includes unparsed feeds.
