# 01 — Web route coverage (high-level)

## Goal

Expand from smoke-level coverage to broad route-family coverage, prioritizing user-visible correctness and critical interaction paths.

## Route clusters

1. Public discovery and browse pages
- Home, lists, and detail pages (podcasts, episodes, tracks, artists, albums, clips, livestream lists/details).

2. Auth and account entry pages
- login/sign-up/forgot-password/reset-password/set-password/verify-email/email-change flows.

3. User workspace pages
- my-profile/settings/history/queues/my-clips/playlists and related create/edit flows.

4. Add-by-RSS flows
- add-by-rss input, parse transitions, resource pages, and save-to-account behavior.

5. Static and informational pages
- about/contact/terms/updates/mobile-app/donate and related low-risk pages.

## Expected assertions per cluster

- Route renders expected shell and key heading/action points.
- Logged-out vs logged-in behavior is explicit.
- Protected routes redirect or gate correctly.
- Not-found/invalid-id behavior is defined for dynamic routes.

## Inputs for granular next pass

- Build a route-to-spec matrix from `apps/web/src/app/**/page.tsx`.
- Mark each route as: smoke-only, interaction-level, or deep-flow.
