---
description: "Machine exports are CI + develop only; source is .cursor"
applyTo:
  - ".llm/exports/**"
  - "scripts/llm/**"
---

# LLM machine exports (`.llm/exports/*`)

- Source of truth: `.cursor/`, `.cursorrules`. The **`llm-exports-sync`** GitHub Action on **`develop`** runs the deterministic export; use **`git add -f` there only**.
- **Do not** hand-commit generated paths (`skills/`, `instructions/`, per-target `copilot-instructions.md`); they are **gitignored**. See the **`llm-cursor-source`** skill and [`.llm/exports/README.md`](../../.llm/exports/README.md).
