# LLM export targets (contracts)

**Source of truth in git:** `.cursor/skills/`, `.cursor/rules/`, `.cursorrules`, and (for ignore semantics) **`.cursorignore`**.

**Generated mirrors:** under `.llm/exports/<target-id>/` with a marker file (`.gitkeep` or `.export-target`). The sync script is allowlisted in `scripts/llm/allowed-targets.mjs` and registered by directory discovery.

**Incremental `sync`:** overwrites files produced from current `.cursor` content. **Orphan** files (leftover after a skill or rule is deleted or renamed in `.cursor`) remain until you run `sync --full` or the **LLM exports full** workflow, which deletes each target’s generated `skills/`, `instructions/`, and that target’s root instruction file, then regenerates.

---

## `github-copilot`

- **Role:** Single mirror for **GitHub Copilot** and **VS Code with the Copilot extension** — one tree, not a separate `vscode` export. The name reflects the on-disk layout and usual mapping to [`.github/`](https://docs.github.com/copilot), not a different product from “Copilot in VS Code.”
- **Inputs:** `.cursor/skills/**/SKILL.md`, `.cursor/rules/*.mdc`, `.cursorrules`.
- **Output (under `.llm/exports/github-copilot/`):**
  - `skills/<name>/SKILL.md` — normalized YAML frontmatter (`name` / `description`) for tool consumption.
  - `instructions/<rule-stem>.instructions.md` — from each `.mdc` rule; frontmatter remapped to `description` + `applyTo` where applicable.
  - `copilot-instructions.md` — from `.cursorrules` (wrapped in HTML comment headers).
- **Path rewrites:** After generation, in-tree references to `.cursor/skills/`, `.cursor/rules/…`, and `.cursor/rules/` are rewritten to point at this export’s `skills/` and `instructions/`.
- **`.cursorignore`:** Not copied into the export. Tools should respect the repository root [`.cursorignore`](../../../.cursorignore) for Cursor-originated ignore rules; those paths are Cursor-centric and are **non-destructive** for other IDEs. For GitHub Copilot, consumers often also map this tree into [`.github/`](../../../.github) per [`.llm/exports/README.md`](../../../.llm/exports/README.md).

---

## `opencode`

- **References:** [OpenCode skills](https://open-code.ai/docs/en/skills) describe project skills under **`.opencode/skills/<skillname>/SKILL.md`** and optional global config. [OpenCode config](https://open-code.ai/docs/en/config) uses `opencode.json` (project, user, organization precedence). The `/init` style flow can produce **`AGENTS.md`** for project context.
- **This repo’s export:** We emit the **same portable mirror** as `github-copilot` under **`.llm/exports/opencode/`** (skills, instructions, **`opencode-instructions.md`** from `.cursorrules`) so one pipeline serves every target. That keeps CI and `sync --full` simple.
- **Adoption for native OpenCode layout:** Copy or symlink `skills` → **`.opencode/skills`**, and align instruction files with your `opencode.json` / `AGENTS.md` workflow, or use the editor alignment prompt. This remains a **human or tool-specific** step, like the `github-copilot` → `.github/` mapping.
- **`.cursorignore`:** Same as other targets; OpenCode has its own tool/indexing ignore options — do not assume `.cursorignore` is read the same as in Cursor; keep root `.cursorignore` for shared human intent and adjust OpenCode config as needed.

---

## Future IDEs

Add a row here, add `target-id` to `ALLOWED_TARGET_IDS`, a marker under `.llm/exports/<id>/`, `.gitignore` lines for generated paths, and an adapter in `scripts/llm/lib/` wired in `export-from-cursor.mjs`.

---

## Cross-target: `.cursorignore` mapping (conceptual)

| Artifact                   | Role                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository `.cursorignore` | Defines what Cursor (and some agents) should not index; remains the **committed** source for those patterns.                                                                                    |
| Export targets             | We do not emit a second ignore file in v1; documentation above applies. If a future target requires a derived ignore file, add a subsection under that target and teach the adapter explicitly. |
