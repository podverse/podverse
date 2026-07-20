# 07 — Opportunistic primitives migrate (Home / Search / Library)

Implement master step **9b.7**.

## Detail docs

- [496-visual-primitives-migrate-opportunistic](/docs/proposals/mobile/_master-plan_/details/496-visual-primitives-migrate-opportunistic.md)

## Decision / skills

- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
- **mobile-theme-parity** § Screen & visual parity

## Tasks

1. Migrate primary list rows on **Home**, **Search**, and **at least one Library** screen to
   `ListRow` / `Card` / `Button` from `components/primitives/`.
2. Preserve web information architecture; note intentional platform divergences if any.
3. Do **not** require a full visual polish pass — opportunistic only.
4. Mark **9b.7** / **496** `done`.
5. On this final plan-set step: mark COPY-PASTA complete, archive
   `.llm/plans/active/mobile-pg6.5-data-layer/` → `.llm/plans/completed/mobile-pg6.5-data-layer/`
   per **plan-completion**, and end the agent response with **cumulative** operator verification
   commands for the whole set.

## Acceptance

- Home + Search + one Library screen use shared primitives for primary lists
- Existing Maestro areas (home / search / library) remain the operator verify targets

Do not run tests during agent work.
