# 02 — Monorepo target structure for mobile

## Scope

Generate a **proposal document** describing the **target** monorepo structure and structural changes
needed to support `apps/mobile` (React Native / Expo prebuild) without disrupting server/web CI.

**Output file:** `docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md`

Build on the assessment in `DOCS-MOBILE-MONOREPO-CURRENT-STATE.md` (from prompt 01) if it exists.
Docs only — no production code changes in this prompt.

## Audience

Operators planning the mobile workspace bootstrap and any prerequisite package extractions.

## Required document sections

1. **Recommendation summary** — isolated `apps/mobile`; off Node build graph; shared packages only
   downward in tier graph.
2. **Target directory layout** — tree for `apps/mobile/` (app source, `ios/`, `android/`,
   `modules/` for native car/audio bridge); reference
   [initial-decisions CarPlay doc](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).
3. **`packages/playback-core` proposal** — extract pure policy from:
   - `apps/web/src/lib/playback/*` (especially `resolvePlaybackLoadDecision.ts`)
   - `apps/web/src/lib/queue/combineQueueNowPlayingAndUpcoming.ts`
   - Types: `playbackLoadRequest`, `playbackTarget`, tests under `__tests__/`
   - Migration steps (phased): create package → move tests → web re-exports/imports → mobile consumes.
   - Tier placement (depends on `@podverse/helpers` only).
4. **Tier D — `apps/mobile/**`** — Metro, extensionless app imports; consume Tier A packages via
   **built `dist/`**; update list of docs/skills to extend:
   - [DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)
   - [.cursor/skills/import-specifiers-tiered/SKILL.md](/.cursor/skills/import-specifiers-tiered/SKILL.md)
   - ESLint override block for `apps/mobile/**`.
5. **Workspace and root `package.json`** — add `apps/mobile` to workspaces; **do not** add to
   `build:packages` / `build:apps`; optional root scripts (`dev:mobile`); mobile deps scoped to
   `apps/mobile/package.json`.
6. **Build order diagram** — mermaid: parallel tracks (Node build vs Metro/native build).
7. **Test and lint isolation** — mobile Vitest/Maestro separate from Playwright; exclude from or
   configure in root `test:unit` / `lint`; reference
   [end-with-targeted-make-report-verify](/.cursor/rules/end-with-targeted-make-report-verify.mdc)
   (mobile E2E not via `make e2e_web_*`).
8. **Metro monorepo configuration** — `watchFolders`, resolving `@podverse/*` from workspace;
   requirement to run `npm run build:packages` before mobile dev when consuming `dist/`.
9. **CI workflows (proposal)** — separate macOS jobs for TestFlight/Play; do not block
   `publish-staging` / `publish-main`; link
   [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md).
10. **i18n target options** — shared catalog package vs symlink vs copy; recommend one with trade-offs.
11. **Change magnitude table** — Small / Medium / Large per work item (playback-core, Tier D,
    `.cursorignore`, CI, Expo bootstrap).
12. **What we are NOT doing** — no repo split; no `@podverse/ui` in mobile; no ORM in mobile.

## Key references

- [architecture-tier-dependencies](/.cursor/rules/architecture-tier-dependencies.mdc)
- [.llm/context/architecture.md](/.llm/context/architecture.md)
- [DOCS-DEVELOPMENT-TOOLING-BUILD-ORDER.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-BUILD-ORDER.md)
- [scripts/publish/bump-version.sh](/scripts/publish/bump-version.sh) — version fan-out when mobile
  workspace exists

## Diagrams (include at least two)

1. Target package graph with `playback-core` and `apps/mobile`.
2. Build/CI isolation (server pipeline vs mobile pipeline).

## Conventions

Same as 01. Link to 01 output as "current state" sibling:
`../monorepo-llm-setup/DOCS-MOBILE-MONOREPO-CURRENT-STATE.md` or relative within track.

## Verification

```bash
test -f docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md
```
