import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const githubRoot = path.join(repoRoot, '.github');

function walk(dirPath, out = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (entry.isFile() && /\.(md|mdc)$/i.test(entry.name)) {
      out.push(fullPath);
    }
  }

  return out;
}

const files = walk(githubRoot);
let changed = 0;

for (const filePath of files) {
  const relativePath = path.relative(githubRoot, filePath).replace(/\\/g, '/');
  if (
    relativePath === 'skills/cursor-copilot-sync/SKILL.md' ||
    relativePath === 'instructions/cursor-copilot-sync.instructions.md'
  ) {
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original
    .replace(/\.cursor\/skills\//g, '.github/skills/')
    .replace(/\.cursor\/rules\/([a-zA-Z0-9._-]+)\.mdc/g, '.github/instructions/$1.instructions.md')
    .replace(/\.cursor\/rules\//g, '.github/instructions/');

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    changed += 1;
  }
}

console.log(`Rewrote references in ${changed} files under ${githubRoot}`);
