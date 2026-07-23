# 06 — Anti-pattern doc (final PG-7b audio prompt)

Implement master step **11.18**.

## Detail docs

- [363-anti-pattern-no-second-video](/docs/proposals/mobile/_master-plan_/details/363-anti-pattern-no-second-video.md)

## Tasks

1. Document in `apps/mobile/APPS-MOBILE.md` and/or media-engine README / AGENTS: never mount a
   second Video/engine on full-screen open; single native surface ownership (`VideoSurfaceHost` /
   bridge attach) when video lands.
2. Cross-link from player module comments.
3. Mark **11.18** / **363** `done`.
4. Leave deferred video steps **11.3, 11.6–11.8, 11.15–11.17** as `planned` (not done).
5. Archive this plan set to `.llm/plans/completed/mobile-pg7b-player/` and update
   `LLM-PLANS-ACTIVE.md`. End with cumulative operator verification for PG-7b (and note PG-7a
   commands if operator ran both sets without testing).

## Acceptance

- Doc searchable via `rg` for VideoSurfaceHost / second Video anti-pattern
- COPY-PASTA checkboxes complete for implemented steps only

Do not run tests during agent work.
