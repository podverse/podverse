import fs from 'node:fs';
import path from 'node:path';

/**
 * Local `llm:vendors` “which editors matter” (plus required `cursor`).
 * Export **target** ids for generated trees are separate — see `allowed-targets.mjs`
 * (e.g. `github-copilot` is a Copilot export layout, not a “vendor” here).
 */
export const SUPPORTED_VENDOR_IDS = ['cursor', 'vscode', 'opencode'];
export const REQUIRED_VENDOR_ID = 'cursor';
export const STATE_RELATIVE_PATH = path.join('.llm', 'local', 'vendors.json');

function uniq(ids) {
  return [...new Set(ids)];
}

export function normalizeVendorIds(ids) {
  const filtered = uniq(
    (ids || []).filter((id) => typeof id === 'string' && SUPPORTED_VENDOR_IDS.includes(id))
  );
  if (!filtered.includes(REQUIRED_VENDOR_ID)) {
    filtered.unshift(REQUIRED_VENDOR_ID);
  }
  return filtered;
}

export function getStatePath(repoRoot) {
  return path.join(repoRoot, STATE_RELATIVE_PATH);
}

export function readLocalVendorState(repoRoot) {
  const statePath = getStatePath(repoRoot);
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return normalizeVendorIds(parsed.activeVendors || []);
  } catch {
    return null;
  }
}

export function writeLocalVendorState(repoRoot, activeVendors) {
  const statePath = getStatePath(repoRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });

  const payload = {
    version: 1,
    activeVendors: normalizeVendorIds(activeVendors),
    lastUpdatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(statePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return statePath;
}

export function resolveActiveVendorIds(repoRoot) {
  const local = readLocalVendorState(repoRoot);
  if (local && local.length > 0) {
    return local;
  }

  return normalizeVendorIds([REQUIRED_VENDOR_ID]);
}
