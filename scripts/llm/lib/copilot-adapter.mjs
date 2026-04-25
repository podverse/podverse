import { exportCursorToGithubStyleMirror } from './github-style-adapter.mjs';

/**
 * GitHub Copilot–style tree under .llm/exports/github-copilot:
 *   skills, instructions, copilot-instructions.md
 */

/**
 * @param {string} repoRoot
 * @param {string} targetRoot
 * @param {string} exportPathPosix
 * @param {{ full?: boolean }} [options]
 */
export function exportGithubCopilot(repoRoot, targetRoot, exportPathPosix, options = {}) {
  exportCursorToGithubStyleMirror(repoRoot, targetRoot, exportPathPosix, {
    full: options.full,
    mainInstructionsFile: 'copilot-instructions.md',
    adapterLabel: 'github-copilot',
  });
}
