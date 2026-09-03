#!/usr/bin/env node
/**
 * List flow YAML paths that still need a run after a Maestro slot run.
 *
 * Usage:
 *   node scripts/mobile/e2e-list-failed-flows.mjs [--mode=failed|unresolved] <slot-dir> <flow.yaml>...
 *
 * Prints one absolute-or-as-passed YAML path per line. Only titles that match a `name:` in the
 * given YAML list are considered.
 *
 * - `failed` (default): flows whose *latest* commands-(Title).json run (by mtime) has status
 *   failed/ERROR/timedOut. This is the retry set.
 * - `unresolved`: the above plus flows with no command log at all. Used after the runner reboots
 *   a wedged device, where "never got to run" and "ran and failed" both still need a real result.
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let mode = 'failed';
const positional = [];
for (const arg of args) {
  if (arg.startsWith('--mode=')) {
    mode = arg.slice('--mode='.length);
    continue;
  }
  positional.push(arg);
}

const slotDir = positional[0];
const flowPaths = positional.slice(1);

if (!slotDir || flowPaths.length === 0) {
  console.error(
    'Usage: node scripts/mobile/e2e-list-failed-flows.mjs [--mode=failed|unresolved] <slot-dir> <flow.yaml> [flow.yaml...]'
  );
  process.exit(1);
}

if (mode !== 'failed' && mode !== 'unresolved') {
  console.error(`Unknown --mode: ${mode}. Expected failed or unresolved.`);
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

const selected = new Set();
for (const [title, info] of latestByTitle) {
  if (info.status === 'failed' || info.status === 'timedOut') {
    const yamlPath = nameToYaml.get(title);
    if (yamlPath !== undefined) {
      selected.add(yamlPath);
    }
  }
}

if (mode === 'unresolved') {
  for (const [title, yamlPath] of nameToYaml) {
    if (!latestByTitle.has(title)) {
      selected.add(yamlPath);
    }
  }
}

for (const p of [...selected].sort()) {
  console.log(p);
}
