# 03 — LLM / Cursor setup for mobile

## Scope

Generate a **proposal document** for optimizing Cursor (LLM-driven development) when `apps/mobile`
exists in the monorepo.

**Output file:** `docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md`

Complements [initial-decisions LLM doc](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-LLM-CONTEXT.md)
with **actionable, file-level** recommendations (proposed content for rules/skills/ignore — do not
commit those files unless the operator asks; this prompt outputs the proposal doc only).

## Audience

Operators and agents working in Cursor on mobile features.

## Required document sections

1. **Principles** — retrieval not full-repo load; scope sessions per app; tier boundaries.
2. **`.cursorignore` additions** — full list with rationale:
   - `apps/mobile/ios/Pods/`, `ios/build/`
   - `apps/mobile/android/.gradle/`, `android/build/`, `app/build/`
   - `apps/mobile/.expo/`
   - Optional: large generated assets
3. **`apps/mobile/AGENTS.md` proposal** — outline sections: stack (Expo prebuild), allowed
   `@podverse/*` imports, forbidden imports (`@podverse/ui`, `orm`, etc.), native module layout,
   bearer auth not cookies, link to playback-core and car native cache.
4. **`apps/mobile/APPS-MOBILE.md` proposal** — human + agent contributor doc (toolchain commands from
   repo root, e.g. `npm run … -w apps/mobile`).
5. **New `.cursor/rules/` proposals** — suggest 1–2 rules with glob patterns, e.g.:
   - `apps/mobile/**` — RN not Next; no Playwright; no `@podverse/ui`
   - CarPlay/Android Auto — native cache contract (link car doc)
   Include **draft rule frontmatter** (`description`, `globs`) and bullet bodies (not full files
   unless concise).
6. **New `.cursor/skills/` proposal** — e.g. `mobile-playback` or extend
   [media-player-architecture](/.cursor/skills/media-player-architecture/SKILL.md): map web policy →
   RN bridge; when to use native module vs JS.
7. **Root doc updates** — what to add to [AGENTS.md](/AGENTS.md) and [.cursorrules](/.cursorrules)
   (mobile tier, commands-from-monorepo-root).
8. **Prompt patterns for operators** — example copy-paste scopes: "work only in apps/mobile and
   packages/playback-core"; "mirror web queue behavior from apps/web/src/contexts/AutoQueue.tsx".
9. **Anti-patterns table** — what causes bad agent output (indexing Pods, editing web bridge for
   mobile, using cookie auth helpers, etc.).
10. **Checklist** — ordered steps to apply setup when mobile workspace is bootstrapped.
11. **Relationship to Track B docs** — mobile process docs live under `app-development-process/`;

    LLM setup doc points agents there for feature parity.

## Exploration checklist

- [.cursorignore](/.cursorignore) — current state
- [apps/web/AGENTS.md](/apps/web/AGENTS.md) — pattern to mirror
- [.cursor/rules/](/.cursor/rules/) — sample `.mdc` structure
- [documentation-conventions skill](/.cursor/skills/documentation-conventions/SKILL.md)

## Diagram (optional)

Mermaid: agent context flow — user prompt → retrieval (scoped paths) → mobile AGENTS + rules →
shared packages.

## Conventions

Markdown ≤100 cols. Proposed rule/skill text in fenced blocks. Do not create `.cursor/` files in
this prompt — document what to create later.

## Verification

```bash
test -f docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md
```
