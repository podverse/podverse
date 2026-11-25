#!/usr/bin/env node
/**
 * Fail the EAS pre-install when MOBILE_PACKAGES does not match the @podverse
 * packages apps/mobile reaches, or when a package is listed before one it depends on.
 *
 * dist/ is not committed. Metro resolves each package's main (dist/index.js), so a
 * package missing from the list fails the iOS and Android JavaScript bundles the same way.
 *
 * Usage: node scripts/mobile/check-eas-mobile-packages.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const packageRelFromName = (name) => {
  if (!name.startsWith('@podverse/')) {
    return null;
  }
  return `packages/${name.slice('@podverse/'.length)}`;
};

export const listedPackages = () => {
  const text = readFileSync(join(SCRIPT_DIR, 'eas-build-pre-install.sh'), 'utf8');
  const match = text.match(/MOBILE_PACKAGES=\(([^)]*)\)/);
  if (match === null) {
    throw new Error('MOBILE_PACKAGES=(...) is missing from eas-build-pre-install.sh');
  }
  return match[1]
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0);
};

const podverseDeps = (packageDirRel) => {
  const pkgPath = join(REPO_ROOT, packageDirRel, 'package.json');
  if (!existsSync(pkgPath)) {
    return { missing: true, deps: [] };
  }
  const pkg = readJson(pkgPath);
  const deps = [];
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const rel = packageRelFromName(name);
    if (rel !== null) {
      deps.push(rel);
    }
  }
  return { missing: false, deps };
};

export const requiredPackages = () => {
  const mobile = readJson(join(REPO_ROOT, 'apps/mobile/package.json'));
  const queue = [];
  for (const spec of Object.values(mobile.dependencies ?? {})) {
    if (typeof spec === 'string' && spec.startsWith('file:../../packages/')) {
      queue.push(spec.slice('file:../../'.length).replace(/\/$/, ''));
    }
  }

  const required = [];
  const depsOf = new Map();
  const seen = new Set();
  const missingDirs = [];
  while (queue.length > 0) {
    const rel = queue.shift();
    if (rel === undefined || seen.has(rel)) {
      continue;
    }
    seen.add(rel);
    required.push(rel);
    const { missing, deps } = podverseDeps(rel);
    if (missing) {
      missingDirs.push(rel);
      depsOf.set(rel, []);
      continue;
    }
    depsOf.set(rel, deps);
    for (const dep of deps) {
      if (!seen.has(dep)) {
        queue.push(dep);
      }
    }
  }
  return { required, depsOf, missingDirs };
};

export const compileListProblems = (listed, required, depsOf, missingDirs) => {
  const errors = [];
  if (missingDirs.length > 0) {
    errors.push(
      `These paths have no package.json:\n${missingDirs.map((rel) => `  ${rel}`).join('\n')}`
    );
  }

  const duplicates = listed.filter((rel, index) => listed.indexOf(rel) !== index);
  if (duplicates.length > 0) {
    errors.push(
      `Listed more than once:\n${[...new Set(duplicates)].map((rel) => `  ${rel}`).join('\n')}`
    );
  }

  const listedSet = new Set(listed);
  const requiredSet = new Set(required);
  const missing = required.filter((rel) => !listedSet.has(rel));
  const extra = listed.filter((rel) => !requiredSet.has(rel));
  if (missing.length > 0) {
    errors.push(
      `Missing from MOBILE_PACKAGES (Metro then reports dist/index.js unresolved):\n${missing
        .map((rel) => `  ${rel}`)
        .join('\n')}`
    );
  }
  if (extra.length > 0) {
    errors.push(
      `Listed, but apps/mobile does not reach them:\n${extra.map((rel) => `  ${rel}`).join('\n')}`
    );
  }

  const index = new Map(listed.map((rel, position) => [rel, position]));
  const order = [];
  for (const rel of listed) {
    for (const dep of depsOf.get(rel) ?? []) {
      const depIndex = index.get(dep);
      const relIndex = index.get(rel);
      if (depIndex === undefined || relIndex === undefined) {
        continue;
      }
      if (depIndex > relIndex) {
        order.push(`  ${rel} is listed before ${dep}`);
      }
    }
  }
  if (order.length > 0) {
    errors.push(`Out of dependency order:\n${order.join('\n')}`);
  }
  return errors;
};

const main = () => {
  const listed = listedPackages();
  const { required, depsOf, missingDirs } = requiredPackages();
  const errors = compileListProblems(listed, required, depsOf, missingDirs);
  if (errors.length > 0) {
    console.error('EAS mobile package compile list does not match apps/mobile.');
    console.error(errors.join('\n'));
    process.exit(1);
  }
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
