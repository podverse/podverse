# Add by RSS - Web UI Detail Navigation

## Goal

Support navigation to podcast-like detail views using URL parameters instead of public routes.

## Scope

- URL parameter scheme for detail navigation.
- Routing for Add by RSS detail pages.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Plan

1. Use path params with synthetic `id_text` for Add by RSS detail views.
2. Add routes that resolve `id_text` to client-stored data.
3. Keep routes private to the current user’s client state.
