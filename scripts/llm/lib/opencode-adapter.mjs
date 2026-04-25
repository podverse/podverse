import { exportCursorToGithubStyleMirror } from './github-style-adapter.mjs';

/**
 * Portable mirror for OpenCode-oriented workflows (same on-disk shape as github-copilot).
 * OpenCode’s native project layout uses `.opencode/skills/…`; this export is a stable repo mirror — see EXPORT-TARGETS.md.
 */

/**
 * @param {string} repoRoot
 * @param {string} targetRoot
 * @param {string} exportPathPosix
 * @param {{ full?: boolean }} [options]
 */
export function exportOpencode(repoRoot, targetRoot, exportPathPosix, options = {}) {
  exportCursorToGithubStyleMirror(repoRoot, targetRoot, exportPathPosix, {
    full: options.full,
    mainInstructionsFile: 'opencode-instructions.md',
    adapterLabel: 'opencode',
  });
}
