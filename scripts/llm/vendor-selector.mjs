#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import {
  normalizeVendorIds,
  readLocalVendorState,
  REQUIRED_VENDOR_ID,
  resolveActiveVendorIds,
  SUPPORTED_VENDOR_IDS,
  writeLocalVendorState,
} from './vendor-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function out(message = '') {
  process.stdout.write(`${message}\n`);
}

function printMenu(active) {
  const activeSet = new Set(active);
  out('\nLLM vendors (local-only selection):');
  SUPPORTED_VENDOR_IDS.forEach((vendorId, index) => {
    const enabled = activeSet.has(vendorId);
    const lock = vendorId === REQUIRED_VENDOR_ID ? ' (required)' : '';
    out(`${index + 1}. [${enabled ? 'x' : ' '}] ${vendorId}${lock}`);
  });
  out('\nType a number (or comma-separated numbers) to toggle.');
  out('Type "s" to save, "q" to quit without changes.');
}

function parseSetArg(argv) {
  const idx = argv.indexOf('--set');
  if (idx === -1) {
    return null;
  }
  const raw = argv[idx + 1] || '';
  const list = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return normalizeVendorIds(list);
}

function toggleByIndex(active, index) {
  if (index < 0 || index >= SUPPORTED_VENDOR_IDS.length) {
    return active;
  }

  const target = SUPPORTED_VENDOR_IDS[index];
  if (target === REQUIRED_VENDOR_ID) {
    return normalizeVendorIds(active);
  }

  const set = new Set(active);
  if (set.has(target)) {
    set.delete(target);
  } else {
    set.add(target);
  }
  return normalizeVendorIds([...set]);
}

async function runInteractive() {
  let active = readLocalVendorState(repoRoot) || resolveActiveVendorIds(repoRoot);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    printMenu(active);
    const answer = (await rl.question('selection> ')).trim().toLowerCase();

    if (answer === 'q') {
      out('No changes saved.');
      rl.close();
      return;
    }

    if (answer === 's' || answer === '') {
      const statePath = writeLocalVendorState(repoRoot, active);
      out(`Saved active vendors to ${path.relative(repoRoot, statePath)}`);
      rl.close();
      return;
    }

    const parts = answer
      .split(',')
      .map((v) => Number.parseInt(v.trim(), 10))
      .filter((n) => Number.isFinite(n));

    if (parts.length === 0) {
      out('Invalid selection.');
      continue;
    }

    let next = active;
    for (const n of parts) {
      next = toggleByIndex(next, n - 1);
    }
    active = next;
  }
}

async function main() {
  const setArg = parseSetArg(process.argv.slice(2));
  if (setArg) {
    const statePath = writeLocalVendorState(repoRoot, setArg);
    out(`Saved active vendors to ${path.relative(repoRoot, statePath)}`);
    return;
  }

  await runInteractive();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
