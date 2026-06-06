# Deferred: Web 404 Hardening

This plan set is saved for later implementation.

## Context
- The observed behavior at `/podcast/As8mB3rOfg` is not a redirect loop.
- It is repeated SSR error rendering in dev after an unhandled API 404 throw.
- This risk exists in multiple dynamic pages in `apps/web`, not only podcast.

## Goal
- Introduce a single high-order server loading boundary that converts only API 404 errors to `notFound()`.
- Rethrow non-404 errors so real failures are still visible.
- Apply this consistently across affected dynamic detail routes.

## Saved plan documents
- `01-stop-404-render-loop-risk.md` (initial focused podcast/SEO plan)
- `02-global-web-404-hardening.md` (full-route audit and architecture plan)

## Implementation status
- Deferred by request.
- No code changes for 404 hardening have been implemented yet.
