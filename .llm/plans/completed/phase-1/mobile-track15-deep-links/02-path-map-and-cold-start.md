# 02 — Path map + cold-start replay (15.3, 15.4)

**Cursor model:** Opus 4.8
**Details:** 452, 453
**Ship bar:** Correct routing for web-flat URLs incl. cold start. No share buttons (03).

## Goal

Translate flat web URLs (`/podcast/:id_text`, etc.) into tab-scoped mobile navigation, align
prefixes to the native scheme, and replay deep links that arrive during the pre-auth `unknown` gate.

## Context (read first)

- Details 452 (path map), 453 (cold-start).
- `apps/mobile/src/navigation/index.tsx` (`mobileNavigationLinking`, existing route paths).
- `apps/mobile/App.tsx` (`status === 'unknown'` renders null — container unmounted).
- `apps/mobile/src/auth/AuthProvider.tsx` (`hydrateFromSecureStorage`, 8s timeout).
- Web paths: `apps/web/src/constants/routes.ts`, `apps/web/src/components/Modal/ModalShare.tsx`.
- Skills: **routing-url-params**, **mobile-data-layer**. Rules: **eqeqeq-strict-equality**,
  **avoid-type-assertions**.

## Tasks

1. **Path map (15.3)** — Add custom `getStateFromPath` (+ `getPathFromState` as needed) mapping
   `/podcast|/episode|/clip|/playlist|/profile|/album|/artist|/track/:id_text` to the right
   tab-scoped screen with the `id_text` param. Align `prefixes` to `podverse-next://` +
   `https://podverse.fm` (keep legacy `podverse://` only if still required).
2. **Cold start (15.4)** — Capture the initial URL + `url` events at app root (above the auth gate);
   buffer a pending URL and replay after `status` resolves and the container mounts. Public content
   routes for anonymous; account-gated targets prompt login then continue. No `unknown` hang.
3. Handle malformed/unknown paths → fall back to Home; document multi-link policy.
4. Mark **15.3, 15.4** `done` in master plan Tracks + Appendix C; detail 452/453 headers `done`.

## Out of scope

- Share affordances (03) and E2E (04).
- Notification tap routing (Track 14.4 — reuses this).

## Acceptance

- `https://podverse.fm/<resource>/<id_text>` routes correctly, warm and cold start.
- Anonymous reaches public content; gated targets resume post-login.
- No dropped cold-start link; no crash on bad paths.
