/**
 * Registries of allowed export target ids. Only these may appear under .llm/exports/<id>/.
 * Add a new id here and implement the adapter in export-from-cursor.mjs when supporting a new editor.
 * When adding an id, add matching commented-out local-path hints at the bottom of `.gitignore`.
 *
 * Naming: prefer that each id’s export tree matches that editor’s documented on-disk layout. The
 * `github-copilot` target is an exception — consumer path is the repo `.github/` directory; see
 * `.llm/exports/LLM-EXPORTS.md` (Naming convention).
 */
export const MAX_EXPORT_TARGETS = 10;

// Keep in sync with `.gitignore` `/.llm/exports/<id>/…` comment blocks and adapter wiring in `export-from-cursor.mjs`.
export const ALLOWED_TARGET_IDS = new Set(['github-copilot', 'opencode']);

export function assertTargetIdAllowed(id) {
  if (!ALLOWED_TARGET_IDS.has(id)) {
    throw new Error(
      `Unknown export target "${id}". Add it to scripts/llm/allowed-targets.mjs and implement an adapter.`
    );
  }
}
