# 01 — Monorepo current state assessment

## Scope

Generate a **proposal document** (not implementation) assessing how well the **current** Podverse
monorepo supports adding a React Native mobile app optimized for LLM-driven (Cursor) development.

**Output file:** `docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-CURRENT-STATE.md`

Create the `monorepo-llm-setup/` directory if missing. Do **not** modify production code.

## Audience

Operators and future agents deciding whether significant repo restructuring is needed before mobile
work begins.

## Required document sections

1. **Executive summary** — verdict: "ready with gaps" vs "needs significant restructuring"; 3–5 bullets.
2. **Current layout inventory** — table of `apps/*`, key `packages/*`, `extensions/*`, `tools/*`
   with one-line purpose (read `package.json` / `APPS-*.md` / `PACKAGES-*.md`).
3. **Shared package compatibility matrix** — which `@podverse/*` packages are safe for RN today and
   which are not (with reasons: DOM, Node, TypeORM, Next peers, etc.).
4. **Build and CI today** — root `package.json` scripts (`build:packages`, `build:apps`, `test:unit`,
   `lint`); explicit workspace lists; Nix `scripts/nix/with-env`; note mobile is **not** present yet.
5. **TypeScript / import tiers today** — Tier A/B/C from
   [DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md);
   note there is no Tier D yet.
6. **Where client business logic lives** — especially playback policy in `apps/web/src/lib/playback/`
   and queue helpers; flag what is pure vs DOM-coupled (see
   [.cursor/skills/media-player-architecture/SKILL.md](/.cursor/skills/media-player-architecture/SKILL.md)).
7. **LLM/Cursor setup today** — inventory `.cursor/rules`, `.cursor/skills`, `.cursorignore`,
   `AGENTS.md`, per-app `apps/web/AGENTS.md`; gaps for mobile.
8. **i18n today** — `apps/web/i18n/originals/`; implications for mobile reuse.
9. **Gap summary table** — risk/opportunity vs effort (High/Med/Low).
10. **Link to prior decisions** — point to
    [initial-decisions/DOCS-MOBILE-MONOREPO-DECISION.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-MONOREPO-DECISION.md)
    without repeating full argument.

## Exploration checklist (read-only)

Explore at minimum:

- [package.json](/package.json) — workspaces, scripts
- [tsconfig.base.json](/tsconfig.base.json), [apps/web/tsconfig.json](/apps/web/tsconfig.json)
- [packages/helpers/src/index.ts](/packages/helpers/src/index.ts)
- [packages/http-request-core/src/authContext.ts](/packages/http-request-core/src/authContext.ts)
- [docs/development/API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)
- [eslint.config.mjs](/eslint.config.mjs) — tier enforcement
- [.cursorignore](/.cursorignore)
- [apps/web/src/lib/playback/resolvePlaybackLoadDecision.ts](/apps/web/src/lib/playback/resolvePlaybackLoadDecision.ts)

Use `grep` / file reads; cite paths in the doc.

## Diagram (include one)

Mermaid: current monorepo tiers (packages → apps) with mobile absent; show where web-only logic
sits today.

## Conventions

- Markdown ≤100 cols; aligned tables.
- Cross-tree links: repo-root `/` paths.
- No `any`; this is prose documentation.
- Do not recommend splitting the repo unless evidence supports it (initial-decisions already chose
  monorepo).

## Verification

Output file exists and is non-empty:

```bash
test -f docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-CURRENT-STATE.md
```
