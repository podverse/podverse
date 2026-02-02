# Add by RSS - Web UI + Client Storage (Overview)

## Goal

Add a new Add by RSS UI section in the web app with list views, detail navigation via URL
params, and client-side persistence with hashes for private feed viewing.

## Scope

- Sidebar navigation section.
- List views with placeholders for saved feeds.
- “Check for Updates” button and progress UI.
- Client-side storage of parsed payload + hash in IndexedDB.
- Synthetic `id`/`id_text` for Add by RSS view models to mirror DB-backed UI patterns.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)
- Shared UI components (as needed):
  [apps/web/src/components/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/)

## Subplans

- Sidebar and navigation:
  [41-web-ui-sidebar-and-nav.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/41-web-ui-sidebar-and-nav.md)
- List views and placeholders:
  [42-web-ui-list-views.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/42-web-ui-list-views.md)
- “Check for Updates” button and progress UI:
  [43-web-ui-check-for-updates.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/43-web-ui-check-for-updates.md)
- Add by RSS feed input UI:
  [44-web-ui-add-feed.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/44-web-ui-add-feed.md)
- Detail navigation via URL params:
  [45-web-ui-detail-navigation.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/45-web-ui-detail-navigation.md)
- Client storage and hashing:
  [46-web-ui-client-storage.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/46-web-ui-client-storage.md)

## Decisions

- Use IndexedDB for parsed payload storage and hashes.
- Use path params with synthetic `id_text` for detail routes.
