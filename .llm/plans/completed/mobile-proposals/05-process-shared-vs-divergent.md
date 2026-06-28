# 05 — Shared vs divergent: web and mobile parity matrix

## Scope

Generate a proposal documenting **what mobile reuses from web/API** vs **what must be built
mobile-specific**, with a parity matrix grounded in real code.

**Output file:** `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md`

Read [DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md)
if present (from prompt 04). Docs only.

## Required document sections

1. **Summary** — reuse API + DTOs + playback policy; rebuild platform shell (UI, storage, push,
   background audio, checkout).
2. **Parity matrix (large table)** — columns:

   | Concern | Web implementation (paths) | Mobile approach | Reuse level |
   | ------- | -------------------------- | --------------- | ----------- |

   Cover at minimum:

   - Auth / session
   - API client (`ApiRequestService`, `req*`)
   - DTOs / validation (`@podverse/helpers`, `helpers-validation/client`)
   - i18n strings
   - Channel / item / episode data loading
   - Search (Podcast Index proxy)
   - Playlists CRUD and resources
   - Queue (server-backed manual queue)
   - Auto-queue (client prefetch)
   - Playback policy (`lib/playback`)
   - Playback transport (HTMLMediaElement vs native player)
   - Stats tracking (`reqStats*`)
   - Membership / PayPal checkout
   - Notifications
   - Downloads / offline
   - Local settings (cookie vs device storage)
   - Deep links / routing
   - V4V / boosts (`v4v-*` packages)
   - Add-by-RSS flows
   - Livestream (video.js vs native HLS)

3. **Endpoint reuse catalog** — grouped list of API route prefixes from `apps/api/src/routes/` with
   corresponding `packages/helpers-requests/src/api/` wrappers mobile should call **unchanged**.
   Highlight mobile auth routes under `/auth/mobile/*`.
4. **Package import allowlist / denylist** — table for mobile (safe vs forbidden packages).
5. **Data loading pattern comparison** — web SSR + client refetch vs mobile app-launch + pull-to-
   refresh; cite one example page (e.g. podcast page) with file paths on both sides.
6. **Consistency rules for agents** — when implementing a mobile screen, which web files to read
   first; do not port SCSS or Next.js patterns.
7. **Gaps requiring API work** — list any endpoints missing typed wrappers or mobile-specific needs
   (explore `helpers-requests` vs `routes/`); "none found" is valid if true.

## Exploration checklist

- [docs/development/API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)
- [apps/api/src/routes/](/apps/api/src/routes/) — file list
- [packages/helpers-requests/src/api/](/packages/helpers-requests/src/api/)
- Web contexts: `Account.tsx`, `Queue.tsx`, `AutoQueue.tsx`, `MediaPlayer.tsx`

## Diagram

Mermaid: two columns "Shared" vs "Mobile-only" with arrows from shared packages to both clients.

## Conventions

Markdown ≤100 cols; aligned tables. Link to overview doc and initial-decisions.

## Verification

```bash
test -f docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md
```
