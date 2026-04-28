# Machine-generated LLM editor exports

**Do not hand-edit** files under `.llm/exports/<target-id>/`. They are produced from the repository’s **source of truth**:

- `.cursor/skills/**`
- `.cursor/rules/**`
- `.cursorrules`

## How exports are updated

- **Authoritative for humans and PRs:** commit only [`.cursor/*`](../../.cursor) and [`.cursorrules`](../../.cursorrules) when changing guidance. Do **not** hand-commit generated paths (`skills/`, `instructions/`, `copilot-instructions.md` under each target). Those paths are **listed in [`.gitignore`](../../.gitignore)**; Cursor also lists **`.llm/exports/github-copilot/`** in [`.cursorignore`](../../.cursorignore) so local tools do not treat the mirror as editable.
- **CI (only writer of generated files):** The [`.github` workflow `llm-exports-sync`](../../.github/workflows/llm-exports-sync.yml), triggered by `.cursor`, `.cursorrules`, or `scripts/llm/` changes on **`develop`** (or `workflow_dispatch`), runs `npm run llm:exports:sync`, updates branch **`llm`**, and creates or updates a single PR from **`llm`** to **`develop`**. You can run the same `sync` locally to inspect; do not `git add` the generated content unless you set `ALLOW_DERIVED_EXPORT_EDIT=1` (rare) and you know the policy.
- **PR behavior:** Humans should not commit generated export trees directly. The automation owns generated file updates through the rolling **`llm` -> `develop`** PR.

## Naming convention

- **Default (new targets):** Use a **stable, kebab-case** `<target-id>` in [`scripts/llm/allowed-targets.mjs`](../../scripts/llm/allowed-targets.mjs) that names the editor or integration. When you add an adapter, shape **`.llm/exports/<target-id>/`** so its **inner** tree matches the **on-disk layout that tool’s docs describe** (so people can `cp -R` or symlink with minimal custom steps). The target folder name and contents should look like the editor’s project-local convention when there is a single obvious root to copy.
- **Exception — `github-copilot`:** Git / VS Code / Copilot project instructions and related files live under the repository **`.github/`** directory (GitHub’s conventional path) — not under a top-level directory literally named `github-copilot` at the project root. In this repo we place the **generated** Copilot-shaped output under **`.llm/exports/github-copilot/`** with a flat shape: `skills/`, `instructions/`, and `copilot-instructions.md` at the top of that tree. **To use it with a workflow that reads `.github/`**, merge these **contents** into your project’s **`.github/`** (e.g. copy `skills` and `instructions` into place and add `copilot-instructions.md` beside them). This repository does not commit that duplicate under `.github/`; keep CI, workflows, and other `.github` files separate and avoid blindly overwriting the whole directory.

## Registering a new export target (max 10)

1. Add **`.llm/exports/<target-id>/.gitkeep`** (or `.export-target`) so Git tracks the directory.
2. Add `<target-id>` to the allowlist in [`scripts/llm/allowed-targets.mjs`](../../scripts/llm/allowed-targets.mjs).
3. Implement the adapter in [`scripts/llm/export-from-cursor.mjs`](../../scripts/llm/export-from-cursor.mjs) (and supporting modules under `scripts/llm/lib/` if needed).

Unknown directory names without an allowlist entry **fail CI**.

## Using GitHub Copilot–shaped output

**Map** the generated files from `.llm/exports/github-copilot/` into the project’s **`.github/`** as needed for your local Copilot setup; see the naming section above. More context: [docs/development/llm/DOCS-DEVELOPMENT-LLM.md](../../docs/development/llm/DOCS-DEVELOPMENT-LLM.md).

## `.state`

[`.state/`](.state/) is reserved for future incremental-export metadata. Do not treat it as an export target.

Local vendor setup is opt-in via `npm run llm:vendors` (default active vendor: `cursor`).
