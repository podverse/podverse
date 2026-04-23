# Cursor to VS Code Copilot Conversion

- Started: 2026-04-23
- Status: Active

### Session 1 - 2026-04-23

#### Prompt (Developer)

discard the script plan i requested. instead, you can just convert for me the cursor files to vs code compatible skills and rules.

#### Prompt (Developer)

Start implementation

I also saved this full execution plan to /memories/session/plan.md so it is ready for handoff and implementation.

#### Key Decisions

- Converted Cursor customizations directly into VS Code Copilot-compatible paths under `.github/`.
- Kept source of truth semantics from existing Cursor files while transforming rule frontmatter for VS Code (`globs`/`alwaysApply` to `applyTo`).
- Enforced skill compatibility by normalizing `name` to match folder name and ensuring required description fields are present.
- Generated `.github/copilot-instructions.md` from `.cursorrules` with conversion header comments.
- Rewrote stale `.cursor/...` references inside converted `.github` files to `.github/...` equivalents.

#### Files Created

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md` (converted from `.cursor/rules/*.mdc`)
- `.github/skills/**` (converted/copied from `.cursor/skills/**`)

#### Files Modified

- `.github/skills/github/SKILL.md` (added missing description)
- `.github/skills/global/SKILL.md` (added missing description)
- `.github/skills/**` (name normalization and reference rewrite)
- `.github/instructions/**` (frontmatter conversion and reference rewrite)

### Session 2 - 2026-04-23

#### Prompt (Developer)

Start implementation

#### Key Decisions

- Persisted conversion tooling under `scripts/development/` so sync is reusable and not tied to `/tmp` files.
- Added repo-level npm commands for sync and validation (`ai:sync:cursor-copilot`, `ai:sync:cursor-copilot:check`).
- Added a dedicated `.github` instruction and skill to enforce Cursor source-of-truth + mirrored Copilot updates.
- Relaxed validation to treat `.cursor` mentions in policy docs as informational, not failures.

#### Files Modified

- `scripts/development/cursor-to-copilot-sync.mjs`
- `scripts/development/cursor-to-copilot-rewrite-refs.mjs`
- `scripts/development/cursor-to-copilot-validate.mjs`
- `package.json`
- `.github/instructions/cursor-copilot-sync.instructions.md`
- `.github/skills/cursor-copilot-sync/SKILL.md`
- `docs/development/CURSOR-COPILOT-SYNC.md`

### Session 3 - 2026-04-23

#### Prompt (Developer)

instead of putting those files in scripts/development/ i think it would be better to put them in a more specific path like scripts/development/llm/

#### Key Decisions

- Moved Cursor/Copilot sync tooling to `scripts/development/llm/` for clearer ownership and discoverability.
- Updated npm scripts, docs, instruction applyTo globs, and skill references to use the new subdirectory path.
- Re-ran sync validation after relocation and confirmed passing status.

#### Files Modified

- `scripts/development/cursor-to-copilot-sync.mjs` (moved to `scripts/development/llm/cursor-to-copilot-sync.mjs`)
- `scripts/development/cursor-to-copilot-rewrite-refs.mjs` (moved to `scripts/development/llm/cursor-to-copilot-rewrite-refs.mjs`)
- `scripts/development/cursor-to-copilot-validate.mjs` (moved to `scripts/development/llm/cursor-to-copilot-validate.mjs`)
- `package.json`
- `docs/development/CURSOR-COPILOT-SYNC.md`
- `.github/instructions/cursor-copilot-sync.instructions.md`
- `.github/skills/cursor-copilot-sync/SKILL.md`

### Session 4 - 2026-04-23

#### Prompt (Developer)

the CURSOR-COPILOT-SYNC should be in docs/development/llm/

#### Key Decisions

- Moved the Cursor/Copilot sync runbook into `docs/development/llm/` as requested.
- Kept the same filename (`CURSOR-COPILOT-SYNC.md`) and verified no stale references to the old path remained.

#### Files Modified

- `docs/development/CURSOR-COPILOT-SYNC.md` (moved to `docs/development/llm/CURSOR-COPILOT-SYNC.md`)

### Session 5 - 2026-04-23

#### Prompt (Developer)

i don't want to use "ai" as a naming convention, i want to use "llm"

#### Prompt (Developer)

perform the edits

#### Key Decisions

- Renamed sync npm scripts from `ai:*` to `llm:*` in both repos.
- Updated all Cursor/Copilot sync docs and skill/instruction references to use the new `llm:*` script names.
- Fixed malformed `applyTo` YAML indentation in both sync instruction files.

#### Files Modified

- `package.json`
- `.github/instructions/cursor-copilot-sync.instructions.md`
- `.github/skills/cursor-copilot-sync/SKILL.md`
- `docs/development/llm/CURSOR-COPILOT-SYNC.md`

### Session 6 - 2026-04-23

#### Prompt (Developer)

Start implementation

#### Key Decisions

- Tightened Cursor/Copilot sync guardrails with explicit stop-and-fix conditions for missing or one-sided mirror changes.
- Added missing Cursor-side `cursor-copilot-sync` skill and rule sources so Copilot mirrors are no longer one-sided.
- Fixed `repoRoot` resolution in sync/rewrite/validate scripts after the `scripts/development/llm/` move so commands run against the actual repo root.
- Upgraded validation to enforce source/mirror parity for skills, rules, and `.cursorrules`/`.github/copilot-instructions.md`.
- Updated rewriter behavior to skip `cursor-copilot-sync` policy mirrors so source-of-truth `.cursor/*` references are preserved there.

#### Files Modified

- `.cursor/skills/cursor-copilot-sync/SKILL.md`
- `.cursor/rules/cursor-copilot-sync.mdc`
- `.github/skills/cursor-copilot-sync/SKILL.md`
- `.github/instructions/cursor-copilot-sync.instructions.md`
- `scripts/development/llm/cursor-to-copilot-sync.mjs`
- `scripts/development/llm/cursor-to-copilot-rewrite-refs.mjs`
- `scripts/development/llm/cursor-to-copilot-validate.mjs`
- `.github/skills/**` (regenerated via sync)
- `.github/instructions/**` (regenerated via sync)
