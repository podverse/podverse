import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return { frontmatter: '', body: content };
  }

  return { frontmatter: match[1], body: content.slice(match[0].length) };
}

function copyDirRecursive(src, dst) {
  ensureDir(dst);

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, destPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function normalizeSkill(skillPath, folderName) {
  const content = fs.readFileSync(skillPath, 'utf8');
  const parsed = parseFrontmatter(content);

  if (!parsed.frontmatter) {
    const generated = [
      '---',
      `name: ${folderName}`,
      `description: ${quoteYaml(`Converted from .cursor/skills/${folderName}/SKILL.md`)}`,
      '---',
      '',
      parsed.body,
    ].join('\n');
    fs.writeFileSync(skillPath, generated, 'utf8');
    return;
  }

  const lines = parsed.frontmatter.split('\n');
  const out = [];
  let sawName = false;
  let sawDescription = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('name:')) {
      out.push(`name: ${folderName}`);
      sawName = true;
      continue;
    }

    if (trimmed.startsWith('description:')) {
      sawDescription = true;
    }

    out.push(line);
  }

  if (!sawName) {
    out.unshift(`name: ${folderName}`);
  }

  if (!sawDescription) {
    out.splice(
      1,
      0,
      `description: ${quoteYaml(`Converted from .cursor/skills/${folderName}/SKILL.md`)}`
    );
  }

  const rewritten = ['---', ...out, '---', '', parsed.body].join('\n');
  fs.writeFileSync(skillPath, rewritten, 'utf8');
}

function parseRuleFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
  let description = '';
  let alwaysApply;
  let globs;

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].trim();

    if (current.startsWith('description:')) {
      description = current
        .slice('description:'.length)
        .trim()
        .replace(/^['\"]|['\"]$/g, '');
      continue;
    }

    if (current.startsWith('alwaysApply:')) {
      const raw = current.slice('alwaysApply:'.length).trim().toLowerCase();
      if (raw === 'true') {
        alwaysApply = true;
      } else if (raw === 'false') {
        alwaysApply = false;
      }
      continue;
    }

    if (!current.startsWith('globs:')) {
      continue;
    }

    const rest = current.slice('globs:'.length).trim();
    if (rest === '[]') {
      globs = [];
      continue;
    }

    if (rest.length > 0) {
      globs = [rest.replace(/^['\"]|['\"]$/g, '')];
      continue;
    }

    const values = [];
    let j = i + 1;

    while (j < lines.length) {
      const next = lines[j].trim();
      if (next.length === 0) {
        j += 1;
        continue;
      }

      if (next.startsWith('- ')) {
        values.push(
          next
            .slice(2)
            .trim()
            .replace(/^['\"]|['\"]$/g, '')
        );
        j += 1;
        continue;
      }

      break;
    }

    globs = values;
  }

  return { description, alwaysApply, globs };
}

function convertRuleFile(srcFile, dstFile) {
  const source = fs.readFileSync(srcFile, 'utf8');
  const parsed = parseFrontmatter(source);
  const ruleData = parseRuleFrontmatter(parsed.frontmatter || '');

  const out = ['---'];
  out.push(
    `description: ${quoteYaml(ruleData.description || `Converted from ${path.basename(srcFile)}`)}`
  );

  const hasGlobs = Array.isArray(ruleData.globs) && ruleData.globs.length > 0;
  if (hasGlobs) {
    if (ruleData.globs.length === 1) {
      out.push(`applyTo: ${quoteYaml(ruleData.globs[0])}`);
    } else {
      out.push('applyTo:');
      for (const glob of ruleData.globs) {
        out.push(`  - ${quoteYaml(glob)}`);
      }
    }
  } else if (ruleData.alwaysApply === true) {
    out.push('applyTo: "**"');
  }

  out.push('---');
  out.push('');

  ensureDir(path.dirname(dstFile));
  fs.writeFileSync(dstFile, out.join('\n') + parsed.body, 'utf8');
}

function syncCursorToCopilot() {
  const cursorDir = path.join(repoRoot, '.cursor');
  const skillsSrc = path.join(cursorDir, 'skills');
  const rulesSrc = path.join(cursorDir, 'rules');

  const githubDir = path.join(repoRoot, '.github');
  const skillsDst = path.join(githubDir, 'skills');
  const instructionsDst = path.join(githubDir, 'instructions');

  ensureDir(skillsDst);
  ensureDir(instructionsDst);

  let skillCount = 0;
  if (fs.existsSync(skillsSrc)) {
    for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const src = path.join(skillsSrc, entry.name);
      const dst = path.join(skillsDst, entry.name);
      copyDirRecursive(src, dst);

      const skillFile = path.join(dst, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        normalizeSkill(skillFile, entry.name);
      }

      skillCount += 1;
    }
  }

  let ruleCount = 0;
  if (fs.existsSync(rulesSrc)) {
    for (const entry of fs.readdirSync(rulesSrc, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.mdc')) {
        continue;
      }

      const src = path.join(rulesSrc, entry.name);
      const dst = path.join(instructionsDst, entry.name.replace(/\.mdc$/, '.instructions.md'));
      convertRuleFile(src, dst);
      ruleCount += 1;
    }
  }

  const cursorRules = path.join(repoRoot, '.cursorrules');
  if (fs.existsSync(cursorRules)) {
    const source = fs.readFileSync(cursorRules, 'utf8');
    const converted = [
      '<!-- Converted from .cursorrules for VS Code Copilot compatibility. -->',
      '<!-- Source of truth remains .cursorrules unless you choose to invert ownership. -->',
      '',
      source,
    ].join('\n');
    fs.writeFileSync(path.join(githubDir, 'copilot-instructions.md'), converted, 'utf8');
  }

  console.log(`Converted ${skillCount} skills and ${ruleCount} rules for ${repoRoot}`);
}

syncCursorToCopilot();
