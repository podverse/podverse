/**
 * Deterministic export from .cursor + .cursorrules to .llm/exports/<target-id>/.
 * Usage: node scripts/llm/export-from-cursor.mjs [sync|check] [--full]
 *   sync  — write exports (default)
 *   check — in CI, sync then exit 1 if .llm/exports (after git add -f) differs from HEAD; otherwise no-op
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertTargetIdAllowed, MAX_EXPORT_TARGETS } from './allowed-targets.mjs';
import { exportGithubCopilot } from './lib/copilot-adapter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

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

function runAdapters(registered) {
  for (const id of registered) {
    assertTargetIdAllowed(id);
  }

  for (const id of registered) {
    const rel = path.join('.llm', 'exports', id);
    const targetRoot = path.join(repoRoot, rel);
    const exportPathPosix = rel.split(path.sep).join('/');

    if (id === 'github-copilot') {
      exportGithubCopilot(repoRoot, targetRoot, exportPathPosix);
    }
  }
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--full');
  const cmd = args[0] || 'sync';

  const discovered = discoverRegisteredTargets();
  if (discovered.length > MAX_EXPORT_TARGETS) {
    throw new Error(
      `Too many export targets (${discovered.length}). Max is ${MAX_EXPORT_TARGETS}. Remove a directory under .llm/exports/ or change MAX_EXPORT_TARGETS in a dedicated review.`
    );
  }

  if (discovered.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No registered export targets under .llm/exports/ (add <id>/.gitkeep).');
  } else {
    // eslint-disable-next-line no-console
    console.log(`llm-exports: targets ${discovered.join(', ')}`);
    runAdapters(discovered);
  }

  if (cmd === 'check') {
    const ci = process.env.CI === 'true' || process.env.CI === '1';
    if (!ci) {
      // eslint-disable-next-line no-console
      console.log(
        'llm-exports: check skipped (CI= not set). Machine export files are gitignored; develop bot commits them.'
      );
    } else {
      execSync('git add -A -f -- .llm/exports', { cwd: repoRoot, stdio: 'inherit' });
      try {
        execSync('git diff --quiet --exit-code HEAD', { cwd: repoRoot, stdio: 'pipe' });
      } catch {
        console.error(
          'llm:exports:check: .llm/exports (including ignored paths) does not match the current commit. Run the llm-exports sync workflow on develop, or re-run with a clean tree.'
        );
        process.exit(1);
      }
    }
  } else if (cmd !== 'sync') {
    console.error('Usage: node scripts/llm/export-from-cursor.mjs [sync|check] [--full]');
    process.exit(1);
  }
}

main();
