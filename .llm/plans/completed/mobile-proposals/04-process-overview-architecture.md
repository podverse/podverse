# 04 — Mobile app process: overview and architecture

## Scope

Generate the **foundational** Track B proposal: high-level architecture for building the Podverse
mobile app by leveraging the mature web product as a reference implementation.

**Output file:** `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md`

Create `app-development-process/` if missing. Docs only — no code changes.

## Audience

Operators, product, and agents planning mobile screens and layering. Other Track B docs (05–08)
link here.

## Required document sections

1. **Purpose and principles** — same API, same DTOs, same playback/queue *semantics*; native UX
   where required; web as instructive reference not copy-paste UI.
2. **Assumed stack** — RN + Expo prebuild; `@podverse/helpers-requests` bearer auth; native audio +
   car layer (link initial-decisions).
3. **Layered architecture** — mermaid diagram:

   ```mermaid
   flowchart TB
     subgraph mobile [apps/mobile]
       Screens[Screens and navigation]
       Hooks[RN hooks and state]
       Bridge[Native playback bridge]
     end
     subgraph shared [Shared packages]
       HC[helpers DTOs]
       HR[helpers-requests]
       PC[playback-core proposed]
     end
     subgraph backend [apps/api]
       API[REST routes]
     end
     Screens --> Hooks
     Hooks --> HR
     Hooks --> PC
     HR --> API
     Bridge --> Hooks
   ```

4. **Web as reference map** — table: web area → mobile equivalent → primary web files to read when
   implementing (not `@podverse/ui` components — behavior and data loading).
5. **Screen / route map** — table mapping web routes (`apps/web/src/constants/routes.ts` or
   `app/` paths) to proposed mobile screens:

   | Web route | Mobile screen | Primary data sources |
   | --------- | ------------- | -------------------- |
   | `/` home | Home / Subscriptions | `reqChannelGetMany` subscribed |
   | `/podcast/[channel_id]` | Podcast detail | channel + items + live items |
   | `/episode/[item_id]` | Episode detail | item + tabs |
   | `/search` | Search | `reqPodcastIndexSearchPodcasts` |
   | `/playlists`, `/playlist/[id]` | Playlists | playlist APIs |
   | `/profile`, `/my-profile` | Profile | profile content APIs |
   | `/queues`, `/history` | Queue / History | queue APIs |
   | Global player | Mini player + full player | queue + auto-queue + playback |

   Explore `apps/web/src/app/**/page.tsx` and page contexts for accurate API lists.

6. **Navigation model proposal** — tabs vs stack (recommendation with rationale for podcast app UX).
7. **State management proposal** — mirror web provider boundaries at a high level:
   `Account`, `Queue`, `AutoQueue`, `MediaPlayer` → RN Context or Zustand; note SSR vs client-only
   fetch on launch.
8. **Auth flow (mobile)** — `POST /auth/mobile/token`, refresh, secure storage; contrast web cookies
   from [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md).
9. **Out of scope for v1 (optional section)** — embed mode, management-web, workers, livestream HLS
   parity if deferred.
10. **Links to sibling docs** — placeholders for 05–08 filenames in same directory.
11. **Links to Track A** — monorepo-llm-setup docs for tooling.

## Exploration checklist

- [apps/web/src/providers/Providers.tsx](/apps/web/src/providers/Providers.tsx) — provider tree
- [apps/web/src/app/layout.tsx](/apps/web/src/app/layout.tsx) — SSR bootstrap (queue abridged)
- [packages/helpers-requests/src/api/_request.ts](/packages/helpers-requests/src/api/_request.ts)
- [apps/api/src/routes/auth.ts](/apps/api/src/routes/auth.ts) — mobile token routes
- [.cursor/skills/media-player-architecture/SKILL.md](/.cursor/skills/media-player-architecture/SKILL.md)

## Diagrams (required)

1. Layered architecture (above).
2. Screen map or navigation flow (tab + stack mermaid).

## Conventions

Markdown ≤100 cols. Heavy code citations. Do not relitigate RN vs Flutter.

## Verification

```bash
test -f docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md
```
