#!/usr/bin/env node
/**
 * List flow YAML paths that still need a retry after a Maestro slot run.
 *
 * Usage:
 *   node scripts/mobile/e2e-list-failed-flows.mjs <slot-dir> <flow.yaml> [flow.yaml...]
 *
 * Prints one absolute-or-as-passed YAML path per line for flows whose *latest*
 * commands-(Title).json run (by mtime) has status failed/ERROR/timedOut.
 * Only titles that match a `name:` in the given YAML list are considered.
 */

import fs from 'fs';
import path from 'path';

const slotDir = process.argv[2];
const flowPaths = process.argv.slice(3);

if (!slotDir || flowPaths.length === 0) {
  console.error(
    'Usage: node scripts/mobile/e2e-list-failed-flows.mjs <slot-dir> <flow.yaml> [flow.yaml...]'
  );
  process.exit(1);
}

function readFlowName(yamlPath) {
  const text = fs.readFileSync(yamlPath, 'utf8');
  const match = /^name:\s*(.+)\s*$/m.exec(text);
  if (match === null) {
    return null;
  }
  return match[1].trim();
}

function statusFromMeta(status) {
  const raw = String(status ?? 'unknown').toUpperCase();
  if (raw === 'COMPLETED' || raw === 'SUCCESS' || raw === 'PASSED') {
    return 'passed';
  }
  if (raw === 'ERROR' || raw === 'FAILED') {
    return 'failed';
  }
  if (raw === 'SKIPPED') {
    return 'skipped';
  }
  if (raw.includes('TIMEOUT') || raw === 'TIMEDOUT') {
    return 'timedOut';
  }
  return 'unknown';
}

function flowStatusFromCommands(commands) {
  let flowStatus = 'passed';
  for (const entry of commands) {
    const status = statusFromMeta(entry?.metadata?.status);
    if (status === 'failed' || status === 'timedOut') {
      flowStatus = status;
    }
  }
  return flowStatus;
}

function walkCommandFiles(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'flows') {
        continue;
      }
      walkCommandFiles(abs, out);
      continue;
    }
    if (entry.name.startsWith('commands-') && entry.name.endsWith('.json')) {
      out.push(abs);
    }
  }
  return out;
}

const nameToYaml = new Map();
for (const flowPath of flowPaths) {
  if (!fs.existsSync(flowPath)) {
    continue;
  }
  const name = readFlowName(flowPath);
  if (name !== null) {
    nameToYaml.set(name, flowPath);
  }
}

/** @type {Map<string, { mtimeMs: number, status: string }>} */
const latestByTitle = new Map();

for (const abs of walkCommandFiles(slotDir)) {
  const titleMatch = path.basename(abs).match(/^commands-\((.+)\)\.json$/);
  if (titleMatch === null) {
    continue;
  }
  const title = titleMatch[1];
  if (!nameToYaml.has(title)) {
    continue;
  }
  let commands;
  try {
    commands = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(commands)) {
    continue;
  }
  const mtimeMs = fs.statSync(abs).mtimeMs;
  const prev = latestByTitle.get(title);
  if (prev !== undefined && prev.mtimeMs >= mtimeMs) {
    continue;
  }
  latestByTitle.set(title, { mtimeMs, status: flowStatusFromCommands(commands) });
}

const failedPaths = [];
for (const [title, info] of latestByTitle) {
  if (info.status === 'failed' || info.status === 'timedOut') {
    const yamlPath = nameToYaml.get(title);
    if (yamlPath !== undefined) {
      failedPaths.push(yamlPath);
    }
  }
}

failedPaths.sort();
for (const p of failedPaths) {
  console.log(p);
}
