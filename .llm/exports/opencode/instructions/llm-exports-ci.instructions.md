---
description: "Machine exports are CI + develop only; source is .cursor"
applyTo:
  - ".llm/exports/**"
  - "scripts/llm/**"
---

# LLM machine exports (`.llm/exports/*`)

- Source of truth: `.cursor/`, `.cursorrules`. The **`llm-exports-sync`** Action (push to **`develop`**, or `workflow_dispatch`) runs incremental `sync` on the GitHub runner, then updates branch **`llm`**, and **`peter-evans/create-pull-request`** opens or updates a PR from **`llm`** into **`develop`**. Feature PRs are **not** blocked on export diffs; CI does not run `check` on the PR. The **`llm-exports-full`** Action (`workflow_dispatch` only) runs `sync --full` and updates branch **`llm-full`**. The workflow uses `git add -f` of ignored export paths on the runner. **Local** runs of the export script do **not** write unless `LLM_EXPORT_ALLOW_LOCAL=1` (for `scripts/llm/**` work only). Do not hand-mirror with ad-hoc commits; generated machine paths stay under ignore rules.
- **Do not** hand-commit generated paths (`skills/`, `instructions/`, per-target `*-instructions.md` such as `copilot-instructions.md`) except allowlisted files (e.g. target `.gitkeep`); they are under ignore rules. See the **`llm-cursor-source`** and **`llm-exports-scripts`** skills, [docs/development/llm/EXPORT-TARGETS.md](../../docs/development/llm/EXPORT-TARGETS.md), and [`.llm/exports/LLM-EXPORTS.md`](../../.llm/exports/LLM-EXPORTS.md).
- When editing files under `scripts/llm/**`, follow the **`llm-exports-scripts`** skill.
