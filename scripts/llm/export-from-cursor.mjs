/**
 * Deterministic export from .cursor + .cursorrules to .llm/exports/<target-id>/.
 * Usage: node scripts/llm/export-from-cursor.mjs [sync|check] [--full]
 *   sync  — write exports (default) when CI or LLM_EXPORT_ALLOW_LOCAL=1; otherwise no-op
 *   check — in CI, sync then exit 1 if .llm/exports (after git add -f) differs from HEAD; otherwise no-op
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertTargetIdAllowed, MAX_EXPORT_TARGETS } from './allowed-targets.mjs';
import { exportGithubCopilot } from './lib/copilot-adapter.mjs';
import { exportOpencode } from './lib/opencode-adapter.mjs';
import { resolveActiveVendorIds } from './vendor-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function isCi() {
  return process.env.CI === 'true' || process.env.CI === '1';
}

/**
 * Local runs do not write unless explicitly allowed (pipeline / scripts/llm development only).
 * GitHub Actions and other environments that set CI run ungated.
 */
function mayWriteExports() {
  if (isCi()) {
    return true;
  }
  return process.env.LLM_EXPORT_ALLOW_LOCAL === '1';
}

function discoverRegisteredTargets() {
  const exportsRoot = path.join(repoRoot, '.llm', 'exports');
  if (!fs.existsSync(exportsRoot)) {
    return [];
  }
  const names = [];
  for (const entry of fs.readdirSync(exportsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (entry.name === '.state') {
      continue;
    }
    const base = path.join(exportsRoot, entry.name);
    const hasMarker =
      fs.existsSync(path.join(base, '.gitkeep')) ||
      fs.existsSync(path.join(base, '.export-target'));
    if (!hasMarker) {
      console.warn(
        `Skipping .llm/exports/${entry.name}: add .gitkeep or .export-target to opt in.`
      );
      continue;
    }
    names.push(entry.name);
  }
  return names.sort();
}

function runAdapters(registered, { full = false } = {}) {
  for (const id of registered) {
    assertTargetIdAllowed(id);
  }

  for (const id of registered) {
    const rel = path.join('.llm', 'exports', id);
    const targetRoot = path.join(repoRoot, rel);
    const exportPathPosix = rel.split(path.sep).join('/');

    if (id === 'github-copilot') {
      exportGithubCopilot(repoRoot, targetRoot, exportPathPosix, { full });
    } else if (id === 'opencode') {
      exportOpencode(repoRoot, targetRoot, exportPathPosix, { full });
    }
  }
}

function main() {
  const argv = process.argv.slice(2);
  const full = argv.includes('--full');
  const args = argv.filter((a) => a !== '--full');
  const cmd = args[0] || 'sync';

  if (cmd !== 'sync' && cmd !== 'check') {
    console.error('Usage: node scripts/llm/export-from-cursor.mjs [sync|check] [--full]');
    process.exit(1);
  }

  const discovered = discoverRegisteredTargets();
  if (discovered.length > MAX_EXPORT_TARGETS) {
    throw new Error(
      `Too many export targets (${discovered.length}). Max is ${MAX_EXPORT_TARGETS}. Remove a directory under .llm/exports/ or change MAX_EXPORT_TARGETS in a dedicated review.`
    );
  }

  if (discovered.length > 0) {
    const activeVendorIds = resolveActiveVendorIds(repoRoot);
    console.warn(
      `llm-exports: targets ${discovered.join(', ')} | vendors ${activeVendorIds.join(', ')}`
    );

    if (cmd === 'check' && !isCi()) {
      console.warn(
        'llm-exports: check skipped (CI not set). In CI this diffs .llm/exports after sync; see llm-exports-sync workflow.'
      );
    } else if (!mayWriteExports()) {
      console.warn(
        'llm-exports: export writes are disabled outside CI. Set LLM_EXPORT_ALLOW_LOCAL=1 to run sync locally (scripts/llm/ development only). See docs/development/llm/README.md.'
      );
    } else {
      runAdapters(discovered, { full });
    }
  } else {
    console.warn('No registered export targets under .llm/exports/ (add <id>/.gitkeep).');
  }

  if (cmd === 'check' && isCi() && mayWriteExports() && discovered.length > 0) {
    execSync('git add -A -f -- .llm/exports', { cwd: repoRoot, stdio: 'inherit' });
    try {
      execSync('git diff --quiet --exit-code HEAD', { cwd: repoRoot, stdio: 'pipe' });
    } catch {
      console.error(
        'llm:exports:check: .llm/exports (including ignored paths) does not match the current commit. Merge or rebase the latest llm automation PR, or re-run on a clean tree; see docs/development/llm/.'
      );
      process.exit(1);
    }
  }
}

main();
