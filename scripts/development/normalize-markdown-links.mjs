#!/usr/bin/env node
/**
 * Rewrite markdown link hrefs that start with ../ to repo-root paths (leading /).
 * Skips .llm/history/. Dry-run by default; pass --write to apply.
 *
 * Run from repository root:
 *   node scripts/development/normalize-markdown-links.mjs
 *   node scripts/development/normalize-markdown-links.mjs --write
 */

import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const write = process.argv.includes('--write');
const verifyOnly = process.argv.includes('--verify');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  '.artifacts',
  'i18n',
]);

/** Match parent-relative hrefs; allow one level of parentheses in paths (e.g. Next route segments). */
const LINK_HREF_RE = /\]\((\.\.\/(?:[^()]|\([^()]*\))+)\)/g;
const FENCED_BLOCK_RE = /(```[\s\S]*?```)/g;

function isHistoryPath(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  return normalized.startsWith('.llm/history/') || normalized === '.llm/history';
}

function shouldProcessFile(absPath) {
  const rel = path.relative(repoRoot, absPath);
  if (!rel.endsWith('.md') && !rel.endsWith('.mdc')) {
    return false;
  }
  return !isHistoryPath(rel);
}

function shouldEnterDir(absPath) {
  const rel = path.relative(repoRoot, absPath);
  if (rel === '') {
    return true;
  }
  return !isHistoryPath(rel);
}

function pathExists(absPath) {
  return fs.existsSync(absPath);
}

function relToRepoHref(relPath) {
  const normalized = relPath.split(path.sep).join('/');
  return `/${normalized}`;
}

function candidateRepoHrefs(resolvedAbs) {
  const rel = path.relative(repoRoot, resolvedAbs).split(path.sep).join('/');
  const candidates = [rel];

  if (rel.includes('.cursor/.cursor/')) {
    candidates.push(rel.replaceAll('.cursor/.cursor/', '.cursor/'));
  }

  if (rel.startsWith('.cursor/')) {
    candidates.push(rel.slice('.cursor/'.length));
  }

  if (rel.startsWith('.llm/')) {
    const tail = rel.slice('.llm/'.length);
    if (
      !tail.startsWith('plans/') &&
      !tail.startsWith('history/') &&
      !tail.startsWith('exports/')
    ) {
      candidates.push(tail);
    }
  }

  if (rel.startsWith('apps/tools/')) {
    candidates.push(rel.slice('apps/'.length));
  }

  if (rel.startsWith('docs/.llm/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel === 'docs/development/QUICKSTART.md') {
    candidates.push('docs/QUICKSTART.md');
  }

  if (rel === 'docs/GITHUB-LABELS.md') {
    candidates.push('docs/repo-management/GITHUB-LABELS.md');
  }

  if (rel === 'docs/CONTRIBUTING.md') {
    candidates.push('docs/development/CONTRIBUTING.md');
  }

  if (rel === 'docs/development/ENV-REFERENCE.md') {
    candidates.push('docs/development/env/ENV-REFERENCE.md');
  }

  if (rel === 'docs/QUICKSTART.md' || rel === 'docs/development/QUICK-START.md') {
    candidates.push('docs/QUICK-START.md');
  }

  if (rel === 'docs/development/CURSOR-NIX-WITH-ENV.md') {
    candidates.push('docs/CURSOR-NIX-WITH-ENV.md');
  }

  if (rel === '.github/workflows/publish-alpha.yml') {
    candidates.push('.github/workflows/publish-staging.yml');
  }

  if (rel === 'infra/k8s/alpha/common/source/extensions.env') {
    candidates.push('infra/k8s/base/common/source/extensions/extensions.env');
  }

  if (rel === 'docs/AGENTS.md') {
    candidates.push('AGENTS.md');
  }

  if (rel === '.cursor/infra/k8s/scripts/README.md') {
    candidates.push('infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md');
  }

  if (rel === '.cursor/infra/k8s/README.md') {
    candidates.push('infra/k8s/INFRA-K8S.md');
  }

  if (rel === '.cursor/skills/.cursor/rules/infra-k8s.mdc') {
    candidates.push('.cursor/rules/infra-k8s.mdc');
  }

  if (rel === '.cursor/skills/02-api-data-fetching.md') {
    candidates.push('.cursor/skills/web/02-api-data-fetching.md');
  }

  if (rel === '.cursor/skills/nix-terminal-wrapper/SKILL.md') {
    candidates.push('.cursor/rules/nix-terminal-wrapper.mdc');
  }

  if (rel.startsWith('docs/scripts/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel.startsWith('docs/.github/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel.startsWith('docs/tools/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel.startsWith('infra/docs/')) {
    candidates.push(rel.slice('infra/'.length));
  }

  if (rel.startsWith('docs/.cursor/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel.startsWith('docs/packages/') || rel.startsWith('docs/apps/')) {
    candidates.push(rel.slice('docs/'.length));
  }

  if (rel.startsWith('.llm/plans/completed/completed/')) {
    candidates.push(rel.replace('completed/completed/', 'completed/'));
  }

  return candidates;
}

function resolveToRepoHref(href, fileDir, filePath) {
  const hashIndex = href.indexOf('#');
  const pathPart = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : href.slice(hashIndex);

  const resolved = path.normalize(path.join(fileDir, pathPart));
  const relFromRepo = path.relative(repoRoot, resolved);

  if (relFromRepo.startsWith('..')) {
    return { skip: true, reason: 'outside-repo' };
  }

  for (const candidate of candidateRepoHrefs(resolved)) {
    const absCandidate = path.join(repoRoot, candidate);
    if (pathExists(absCandidate)) {
      return { href: relToRepoHref(candidate) + fragment, skip: false };
    }
  }

  return { skip: true, reason: 'missing-target', resolved: relFromRepo.split(path.sep).join('/') };
}

function replaceParentRelativeLinks(segment, fileDir, filePath, stats) {
  return segment.replace(LINK_HREF_RE, (match, href) => {
    const result = resolveToRepoHref(href, fileDir, filePath);
    if (result.skip) {
      stats.skipped.push({
        file: path.relative(repoRoot, filePath),
        href,
        reason: result.reason,
        resolved: result.resolved,
      });
      return match;
    }
    if (result.href === href) {
      return match;
    }
    stats.changeCount += 1;
    return `](${result.href})`;
  });
}

function processContent(content, fileDir, filePath) {
  const stats = { changeCount: 0, missing: [], skipped: [] };
  const parts = content.split(FENCED_BLOCK_RE);
  const updated = parts
    .map((part) => {
      if (part.startsWith('```')) {
        return part;
      }
      return replaceParentRelativeLinks(part, fileDir, filePath, stats);
    })
    .join('');

  return { updated, changeCount: stats.changeCount, skipped: stats.skipped };
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) {
        continue;
      }
      if (!shouldEnterDir(abs)) {
        continue;
      }
      walk(abs, files);
    } else if (shouldProcessFile(abs)) {
      files.push(abs);
    }
  }
  return files;
}

function main() {
  const files = walk(repoRoot);
  let totalChanges = 0;
  let filesChanged = 0;
  const allSkipped = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileDir = path.dirname(filePath);
    const { updated, changeCount, skipped } = processContent(content, fileDir, filePath);

    if (skipped.length > 0) {
      allSkipped.push(...skipped);
    }

    if (changeCount === 0) {
      continue;
    }

    totalChanges += changeCount;
    filesChanged += 1;

    if (write) {
      fs.writeFileSync(filePath, updated, 'utf8');
    } else if (!verifyOnly) {
      console.log(`${path.relative(repoRoot, filePath)}: ${changeCount} link(s)`);
    }
  }

  if (verifyOnly) {
    console.log(
      `Verify OK: ${totalChanges} link(s) in ${filesChanged} file(s) would normalize; ${allSkipped.length} skipped.`
    );
    if (allSkipped.length > 0) {
      console.log('Skipped (left unchanged):');
      for (const s of allSkipped.slice(0, 20)) {
        console.log(`  ${s.file}: ${s.href} (${s.reason}${s.resolved ? `: ${s.resolved}` : ''})`);
      }
      if (allSkipped.length > 20) {
        console.log(`  ... and ${allSkipped.length - 20} more`);
      }
    }
    return;
  }

  const mode = write ? 'Wrote' : 'Would update';
  console.log(`${mode} ${totalChanges} link(s) across ${filesChanged} file(s).`);
  if (allSkipped.length > 0) {
    console.log(`Skipped ${allSkipped.length} link(s) (missing target or outside repo).`);
  }
  if (!write) {
    console.log('Pass --write to apply changes.');
  }
}

main();
