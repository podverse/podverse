#!/usr/bin/env node
// Lists every plan-runner run that is waiting on the operator, read from the runner's own
// .artifacts/plan-runner/<set>/state.json. For each run it prints the wrapper to resume through
// and the blocked steps in the order --resume reaches them, with each step's final message.
//
// Usage: node scripts/abcresume/find-stops.mjs

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = '.artifacts/plan-runner';
const ACTIVE_DIR = '.llm/plans/active';

if (!existsSync('.llm/plans')) {
  console.error('Run from the repo root: node scripts/abcresume/find-stops.mjs');
  process.exit(1);
}

function wrapperFor(set) {
  if (set.startsWith('abcplan-')) return `./scripts/abcplan/run.sh plan ${set.slice(8)}`;
  if (set.startsWith('abctest-all-')) return './scripts/abctest/run.sh all';
  if (set.startsWith('abctest-smoke-')) return './scripts/abctest/run.sh smoke';
  if (set.startsWith('abctest-deferred-')) return './scripts/abctest/run.sh deferred';
  if (set.startsWith('branches-merge-')) {
    return `./scripts/abcbranchesmerge/run.sh ${set.slice('branches-merge-'.length)}`;
  }
  if (existsSync(path.join(ACTIVE_DIR, set, '00-REQUEST.md'))) {
    return `./scripts/abcplan/run.sh run ${set}`;
  }
  return `node ../plan-runner/run-plan-set.mjs ${set}`;
}

function hasUntickedStep(set) {
  const file = path.join(ACTIVE_DIR, set, 'COPY-PASTA.md');
  return existsSync(file) && /^- \[ \] \*\*/m.test(readFileSync(file, 'utf8'));
}

function readBlocked(set) {
  const file = path.join(ARTIFACTS_DIR, set, 'state.json');
  if (!existsSync(file)) return [];
  const state = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(state.blocked) ? state.blocked : [];
}

const sets = existsSync(ARTIFACTS_DIR)
  ? readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

let found = 0;
for (const set of sets) {
  const blocked = readBlocked(set);
  const open = hasUntickedStep(set);
  if (blocked.length === 0 && !open) continue;
  found += 1;

  const wrapper = wrapperFor(set);
  console.log(`Set: ${set}`);
  console.log(`  Wrapper: ${wrapper}`);
  if (!existsSync(path.join(ACTIVE_DIR, set, 'COPY-PASTA.md'))) {
    console.log(`  Warning: ${ACTIVE_DIR}/${set}/COPY-PASTA.md is gone; the state is stale.`);
  }
  if (blocked.length === 0) {
    console.log('  Not blocked, but steps are unticked. Rerun the wrapper with no flags.');
    continue;
  }
  blocked.forEach((step, index) => {
    const message = path.join(ARTIFACTS_DIR, set, `${step.id}.md`);
    const order = index === 0 ? 'next --resume reaches this' : `resume #${index + 1}`;
    console.log(`  Blocked ${step.id} (${order}): ${step.title}`);
    console.log(`    Reason: ${step.reason}`);
    console.log(`    Final message: ${existsSync(message) ? message : `${message} (missing)`}`);
  });
}

if (found === 0) console.log('No plan-runner run is waiting on the operator.');
