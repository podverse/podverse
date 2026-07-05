# Plan 03 — Mobile app contributor docs

**Steps:** 0.6, 0.7, 0.17, 0.18
**Model:** Codex 5.3

## Detail references

- [006-mobile-agents-md](/docs/proposals/mobile/_master-plan_/details/006-mobile-agents-md.md)
- [007-apps-mobile-md](/docs/proposals/mobile/_master-plan_/details/007-apps-mobile-md.md)
- [017-mobile-import-allowlist](/docs/proposals/mobile/_master-plan_/details/017-mobile-import-allowlist.md)
- [018-metro-monorepo-doc](/docs/proposals/mobile/_master-plan_/details/018-metro-monorepo-doc.md)

## Proposal context

[DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md) §3–4,
[DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md),
[API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)

## Tasks

1. Create `apps/mobile/` directory if missing (docs-only in this phase).

2. **`apps/mobile/AGENTS.md`** — LLM entrypoint mirroring `apps/web/AGENTS.md` pattern:
   - Link root AGENTS.md
   - Stack: RN + Expo prebuild (not Next.js)
   - Allowed `@podverse/*` imports (helpers, helpers-requests, http-request-core, playback-core when
     extracted, v4v-*, parser-mapping)
   - Forbidden: ui, orm, parser, mq, helpers-backend, helpers-browser, helpers-config, observability,
     external-services-*
   - Bearer auth / secure storage; `/auth/mobile/*`
   - Playback: NativePlaybackBridge + playback-core (pointer to skill)
   - Car: native-only (pointer to rule)

3. **Allowlist table (0.17)** — Add explicit allow/deny table to AGENTS.md from shared-vs-divergent doc.

4. **`apps/mobile/APPS-MOBILE.md`** — Contributor guide:
   - Target directory layout (from monorepo target structure)
   - Commands from repo root (`npm run … -w apps/mobile` when scripts exist; Nix `./scripts/nix/with-env`)
   - Metro monorepo section (0.18): watchFolders, resolve workspace packages to `dist/`, run
     `npm run build:packages` before Metro dev
   - Link mobile-master-plan-phasing for phase workflow
   - E2E: Maestro/Detox not Playwright

## Acceptance

- Both files exist with allowlist and Metro sections.

## On completion

Mark steps **0.6, 0.7, 0.17, 0.18** as `done`.
