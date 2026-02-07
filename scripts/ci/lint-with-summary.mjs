/**
 * Runs type-check, workspace lint, and prettier; streams output and prints
 * a summary of errors/warnings at the end.
 *
 * Usage: node scripts/ci/lint-with-summary.mjs [lint|lint:fix]
 * Default: lint (use lint:fix for fix mode)
 */

import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'lint:fix' ? 'lint:fix' : 'lint';
const prettierScript = mode === 'lint:fix' ? 'prettier:write' : 'prettier:check';

const steps = [
  { name: 'type-check', cmd: 'npm', args: ['run', 'type-check', '--workspaces', '--if-present'] },
  { name: 'lint', cmd: 'npm', args: ['run', mode, '--workspaces', '--if-present'] },
  { name: 'prettier', cmd: 'npm', args: ['run', prettierScript] },
];

const runStep = (step) =>
  new Promise((resolve) => {
    const chunks = [];
    const capture = (data) => {
      const s = data.toString();
      chunks.push(s);
      process.stdout.write(data);
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
const typeCheckFailed = results[0].code !== 0;
const lintFailed = results[1].code !== 0;
const prettierFailed = results[2].code !== 0;

console.log('\n--- Lint summary ---');
console.log(
  `Type-check: ${typeCheckFailed ? 'failed' : 'passed'}${summary.tsErrors ? ` (${summary.tsErrors} TS error(s))` : ''}`
);
console.log(
  `Lint:      ${lintFailed ? 'failed' : 'passed'}${summary.eslintErrors || summary.eslintWarnings ? ` (${summary.eslintErrors} error(s), ${summary.eslintWarnings} warning(s))` : ''}`
);
console.log(
  `Prettier:  ${prettierFailed ? 'failed' : 'passed'}${summary.prettierFiles ? ` (${summary.prettierFiles} file(s) with issues)` : ''}`
);

const anyFailed = typeCheckFailed || lintFailed || prettierFailed;
process.exit(anyFailed ? 1 : 0);
