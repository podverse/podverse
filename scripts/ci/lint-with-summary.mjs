/**
 * Runs i18n compile, type-check, workspace lint, repo-root script lint, and
 * prettier; streams output and prints a summary of errors/warnings at the end.
 * When Prettier fails, prints a unified diff for each failed file so you can
 * see what would change.
 *
 * i18n:compile runs first because apps/web and apps/management-web type-check
 * import generated apps/<app>/i18n/compiled/*.json (gitignored).
 *
 * Usage: node scripts/ci/lint-with-summary.mjs [lint|lint:fix]
 * Default: lint (use lint:fix for fix mode)
 *
 * Mobile lint policy: `apps/mobile` is excluded from workspace type-check and lint
 * until RN ESLint config lands (Track 0 step 0.3). Remove from LINT_EXCLUDED_WORKSPACES
 * once apps/mobile has eslint.config.js and passes root lint.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Workspaces skipped in root lint/type-check until mobile ESLint is ready. */
const LINT_EXCLUDED_WORKSPACES = ['apps/mobile'];

/** Non-workspace paths covered by root eslint.config.mjs (not workspace lint scripts). */
const REPO_SCRIPT_LINT_PATHS = ['tools/web', 'tools/management-web', 'scripts'];

const runWorkspacesArgs = (scriptName) => [
  'scripts/ci/run-workspaces.mjs',
  '--script',
  scriptName,
  '--all',
  ...LINT_EXCLUDED_WORKSPACES.flatMap((workspace) => ['--exclude', workspace]),
];

const mode = process.argv[2] === 'lint:fix' ? 'lint:fix' : 'lint';
const prettierScript = mode === 'lint:fix' ? 'prettier:write' : 'prettier:check';

const filterPrettierOutput = (output) =>
  output
    .split('\n')
    .filter((line) => !line.includes('(unchanged)'))
    .join('\n');

const repoScriptLintArgs = [
  'eslint',
  ...REPO_SCRIPT_LINT_PATHS,
  '--max-warnings',
  '0',
  ...(mode === 'lint:fix' ? ['--fix'] : []),
];

const steps = [
  // Generated catalogs are gitignored; web/management-web type-check imports
  // apps/<app>/i18n/compiled/*.json, so compile before tsc (local + CI).
  { name: 'i18n:compile', cmd: 'npm', args: ['run', 'i18n:compile'] },
  { name: 'type-check', cmd: 'node', args: runWorkspacesArgs('type-check') },
  { name: 'lint', cmd: 'node', args: runWorkspacesArgs(mode) },
  { name: 'lint:repo-scripts', cmd: 'npx', args: repoScriptLintArgs },
  {
    name: 'prettier',
    cmd: 'npm',
    args: ['run', prettierScript],
    outputFilter: filterPrettierOutput,
  },
];

const runStep = (step) =>
  new Promise((resolve) => {
    const chunks = [];
    const capture = (data) => {
      const s = data.toString();
      const filtered = step.outputFilter ? step.outputFilter(s) : s;
      if (!filtered) {
        return;
      }
      chunks.push(filtered);
      process.stdout.write(filtered);
    };
    const child = spawn(step.cmd, step.args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('close', (code) => {
      resolve({ step: step.name, code, output: chunks.join('') });
    });
  });

function parsePrettierFailedFiles(prettierOutput) {
  const files = [];
  for (const line of prettierOutput.split('\n')) {
    const m = line.match(/^\[warn\]\s+(.+)$/);
    if (!m) continue;
    const candidate = m[1].trim();
    if (candidate.startsWith('Code style issues found') || candidate.startsWith('Run Prettier'))
      continue;
    files.push(candidate);
  }
  return files;
}

function getPrettierDiff(filePath) {
  const cwd = process.cwd();
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!fs.existsSync(absolutePath)) return null;
  const current = fs.readFileSync(absolutePath, 'utf8');
  const prettierResult = spawnSync('npx', ['prettier', '--stdin-filepath', filePath], {
    input: current,
    encoding: 'utf8',
    shell: true,
    cwd,
  });
  const formatted = prettierResult.stdout;
  if (formatted === current) return null;
  const tmpDir = os.tmpdir();
  const base = path.basename(filePath);
  const currentTmp = path.join(tmpDir, `prettier-current-${base}`);
  const formattedTmp = path.join(tmpDir, `prettier-formatted-${base}`);
  try {
    fs.writeFileSync(currentTmp, current, 'utf8');
    fs.writeFileSync(formattedTmp, formatted, 'utf8');
    const diffResult = spawnSync('diff', ['-u', currentTmp, formattedTmp], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    });
    let out = diffResult.stdout || '';
    if (out && !out.endsWith('\n')) out += '\n';
    return out
      .replace(`--- ${currentTmp}\n`, `--- ${filePath}\n`)
      .replace(`+++ ${formattedTmp}\n`, `+++ ${filePath}\n`);
  } finally {
    try {
      fs.unlinkSync(currentTmp);
      fs.unlinkSync(formattedTmp);
    } catch {
      // ignore
    }
  }
}

function summarize(output) {
  const summary = { tsErrors: 0, eslintErrors: 0, eslintWarnings: 0, prettierFiles: 0 };

  // TypeScript: "src/file.ts(10,5): error TS2..."
  const tsErrorMatches = output.match(/error\s+TS\d+/g);
  if (tsErrorMatches) summary.tsErrors += tsErrorMatches.length;

  // ESLint: "✖ N problems (E errors, W warnings)" or "N problems (E errors, W warnings)"
  const problemBlocks = output.matchAll(
    /(\d+)\s+problems?\s*\((\d+)\s+errors?,\s*(\d+)\s+warnings?\)/gi
  );
  for (const m of problemBlocks) {
    summary.eslintErrors += Number(m[2]);
    summary.eslintWarnings += Number(m[3]);
  }

  // Prettier: "Code style issues found in 5 files."
  const prettierMatch = output.match(/Code style issues found in (\d+) files?/i);
  if (prettierMatch) summary.prettierFiles = Number(prettierMatch[1]);

  return summary;
}

const results = [];
for (const step of steps) {
  const result = await runStep(step);
  results.push(result);
}

const allOutput = results.map((r) => r.output).join('');
const summary = summarize(allOutput);
const i18nCompileFailed = results[0].code !== 0;
const typeCheckFailed = results[1].code !== 0;
const workspaceLintFailed = results[2].code !== 0;
const repoScriptsLintFailed = results[3].code !== 0;
const prettierFailed = results[4].code !== 0;
const lintFailed = workspaceLintFailed || repoScriptsLintFailed;

console.log('\n--- Lint summary ---');
console.log(`i18n:compile: ${i18nCompileFailed ? 'failed' : 'passed'}`);
console.log(
  `Type-check: ${typeCheckFailed ? 'failed' : 'passed'}${summary.tsErrors ? ` (${summary.tsErrors} TS error(s))` : ''}`
);
console.log(
  `Lint:      ${lintFailed ? 'failed' : 'passed'}${summary.eslintErrors || summary.eslintWarnings ? ` (${summary.eslintErrors} error(s), ${summary.eslintWarnings} warning(s))` : ''}`
);
console.log(
  `Prettier:  ${prettierFailed ? 'failed' : 'passed'}${summary.prettierFiles ? ` (${summary.prettierFiles} file(s) with issues)` : ''}`
);

if (prettierFailed && summary.prettierFiles > 0) {
  const prettierOutput = results[4].output;
  const failedFiles = parsePrettierFailedFiles(prettierOutput);
  if (failedFiles.length > 0) {
    console.log('\n--- Prettier (what would change) ---');
    for (const file of failedFiles) {
      const diff = getPrettierDiff(file);
      if (diff) {
        console.log(`\n${file}:`);
        console.log(diff);
      }
    }
  }
}

const anyFailed = i18nCompileFailed || typeCheckFailed || lintFailed || prettierFailed;
process.exit(anyFailed ? 1 : 0);
