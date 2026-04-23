import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  return match ? match[1] : '';
}

function getYamlField(frontmatter, key) {
  const regex = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm');
  const match = frontmatter.match(regex);
  if (!match) {
    return '';
  }

  return match[1].trim().replace(/^['\"]|['\"]$/g, '');
}

function walk(dirPath, out = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }

    if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

const issues = [];

function listDirNames(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listFileNames(dirPath, suffix) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name);
}

const skillsRoot = path.join(repoRoot, '.github', 'skills');
if (fs.existsSync(skillsRoot)) {
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folder = entry.name;
    const skillFile = path.join(skillsRoot, folder, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      issues.push(`missing SKILL.md: .github/skills/${folder}/SKILL.md`);
      continue;
    }

    const text = fs.readFileSync(skillFile, 'utf8');
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      issues.push(`missing frontmatter: .github/skills/${folder}/SKILL.md`);
      continue;
    }

    const name = getYamlField(frontmatter, 'name');
    const description = getYamlField(frontmatter, 'description');

    if (!name) {
      issues.push(`missing skill name: .github/skills/${folder}/SKILL.md`);
    } else if (name !== folder) {
      issues.push(`name mismatch (${name} !== ${folder}): .github/skills/${folder}/SKILL.md`);
    }

    if (!description) {
      issues.push(`missing skill description: .github/skills/${folder}/SKILL.md`);
    }
  }
}

const instructionsRoot = path.join(repoRoot, '.github', 'instructions');
if (fs.existsSync(instructionsRoot)) {
  const files = walk(instructionsRoot).filter((filePath) => filePath.endsWith('.instructions.md'));
  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      issues.push(`missing frontmatter: ${path.relative(repoRoot, filePath)}`);
      continue;
    }

    const description = getYamlField(frontmatter, 'description');
    if (!description) {
      issues.push(`missing instruction description: ${path.relative(repoRoot, filePath)}`);
    }
  }
}

const cursorSkillsRoot = path.join(repoRoot, '.cursor', 'skills');
const githubSkillsRoot = path.join(repoRoot, '.github', 'skills');
const cursorSkillFolders = listDirNames(cursorSkillsRoot);
const githubSkillFolders = listDirNames(githubSkillsRoot);

for (const folder of cursorSkillFolders) {
  const mirror = path.join(githubSkillsRoot, folder, 'SKILL.md');
  if (!fs.existsSync(mirror)) {
    issues.push(`missing Copilot skill mirror: .github/skills/${folder}/SKILL.md`);
  }
}

for (const folder of githubSkillFolders) {
  const source = path.join(cursorSkillsRoot, folder, 'SKILL.md');
  if (!fs.existsSync(source)) {
    issues.push(`missing Cursor skill source: .cursor/skills/${folder}/SKILL.md`);
  }
}

const cursorRulesRoot = path.join(repoRoot, '.cursor', 'rules');
const githubInstructionsRoot = path.join(repoRoot, '.github', 'instructions');
const cursorRuleNames = listFileNames(cursorRulesRoot, '.mdc').map((name) =>
  name.replace(/\.mdc$/, '')
);
const githubInstructionNames = listFileNames(githubInstructionsRoot, '.instructions.md').map(
  (name) => name.replace(/\.instructions\.md$/, '')
);

for (const rule of cursorRuleNames) {
  if (!githubInstructionNames.includes(rule)) {
    issues.push(`missing Copilot rule mirror: .github/instructions/${rule}.instructions.md`);
  }
}

for (const instruction of githubInstructionNames) {
  if (!cursorRuleNames.includes(instruction)) {
    issues.push(`missing Cursor rule source: .cursor/rules/${instruction}.mdc`);
  }
}

const cursorRulesFile = path.join(repoRoot, '.cursorrules');
const copilotInstructions = path.join(repoRoot, '.github', 'copilot-instructions.md');
if (fs.existsSync(cursorRulesFile) && !fs.existsSync(copilotInstructions)) {
  issues.push('missing Copilot mirror: .github/copilot-instructions.md');
}
if (fs.existsSync(copilotInstructions) && !fs.existsSync(cursorRulesFile)) {
  issues.push('missing Cursor source: .cursorrules');
}

const githubRoot = path.join(repoRoot, '.github');
let sourceRefCount = 0;
if (fs.existsSync(githubRoot)) {
  const files = walk(githubRoot).filter((filePath) => /\.(md|mdc)$/i.test(filePath));
  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    if (/\.cursor\/(skills|rules)\//.test(text)) {
      sourceRefCount += 1;
    }
  }
}

if (issues.length > 0) {
  console.error('Cursor/Copilot sync validation failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

if (sourceRefCount > 0) {
  console.log(`Info: found ${sourceRefCount} .cursor source references under .github docs.`);
}

console.log('Cursor/Copilot sync validation passed.');
