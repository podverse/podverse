# 08 — Mobile development roadmap and milestones

## Scope

Generate a **phased roadmap** for building the Podverse mobile app, synthesizing Track A (monorepo
setup) and Track B (process docs 04–07).

**Output file:** `docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md`

Run **last**, after prompts 04–07 (read generated docs if they exist). Docs only.

## Required document sections

1. **Roadmap principles** — prove riskiest pieces first (native audio + car spike); parity with web
   core flows before edge features; API backward compatibility for old app versions.
2. **Phase 0 — Monorepo and LLM prep (no user-facing app)**
   - Apply Track A recommendations: `.cursorignore`, AGENTS/APPS-MOBILE stubs, Tier D docs
   - Optional: create `packages/playback-core` extraction (reference 02)
   - Deliverables checklist
3. **Phase 1 — Spike / technical proof**
   - Expo prebuild skeleton `apps/mobile`
   - Bearer auth to API against dev/test env
   - Background audio survives background/kill
   - Android Auto + CarPlay minimal browse/play with **app closed** (link car doc spike list)
   - Go/no-go criteria
4. **Phase 2 — MVP core (parity with web essentials)**
   - Auth, home/subscriptions, podcast + episode pages, search
   - Manual queue + play + mini player
   - Stats, account settings sync
   - Milestones and acceptance criteria per screen
5. **Phase 3 — Playback sophistication**
   - Full playback policy via `playback-core`
   - Auto-queue, playlists, history
   - Clips/chapters/soundbites as web supports
6. **Phase 4 — Mobile-only features**
   - Offline downloads
   - Push notifications (FCM)
   - Deep links
   - CarPlay/Android Auto polish
7. **Phase 5 — Membership and growth**
   - PayPal/IAP strategy
   - V4V boosts on mobile
   - Store release (TestFlight → production); link
     [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)
8. **Testing strategy by phase** — unit (`playback-core`), API integration (unchanged), Maestro/Detox
   scopes; explicitly **not** Playwright for mobile
9. **Team / LLM workflow by phase** — which docs and web files agents should load per phase; COPY-
   PASTA style task breakdown suggestions
10. **Timeline guidance** — order-of-magnitude for small team (ranges, not commitments); parallel
    workstreams (native car vs RN UI)
11. **Risk register** — top 5 risks with mitigation (car native complexity, React version skew,
    store review delay, API compat, offline storage)
12. **Gantt-style mermaid** — optional timeline diagram (phases as nodes, dependencies as edges)
13. **Index of all proposal docs** — links to:
    - `initial-decisions/*`
    - `monorepo-llm-setup/*`
    - `app-development-process/*`

## Inputs to read before writing

- [00-OVERVIEW.md](../00-OVERVIEW.md) output map
- Generated docs from prompts 01–07 (if present)
- [docs/proposals/mobile/initial-decisions/DOCS-MOBILE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE.md)

## Diagrams (required)

1. Phase dependency diagram (mermaid).
2. Optional: release train (develop → staging → main vs mobile store channels).

## Conventions

Markdown ≤100 cols. This doc is the **entry point** for "how we build mobile" after all proposals
exist; write a short executive summary at top.

## Verification

```bash
test -f docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md
wc -l docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-ROADMAP.md
```
