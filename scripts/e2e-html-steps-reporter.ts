/**
 * Custom Playwright reporter that generates an HTML report with step screenshots
 * and their "Step description" attachments rendered together: each screenshot
 * is immediately followed by an expandable block with the full step description.
 * Use with PLAYWRIGHT_HTML_OUTPUT_DIR set and --reporter=scripts/e2e-html-steps-reporter.ts.
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import fs from 'fs';
import path from 'path';

const STEP_DESCRIPTION_NAME = 'Step description';
const STEP_URL_NAME = 'Step URL';
// Step attachment order expected from the step capture helper: image, Step description, Step URL.

interface ReporterOptions {
  outputFolder?: string;
}

interface CollectedRun {
  test: TestCase;
  result: TestResult;
}

function getScopedSpecSuffix(): string {
  const rawSpec = process.env.E2E_REPORT_SPEC;
  if (typeof rawSpec !== 'string') {
    return '';
  }
  const spec = rawSpec.trim();
  return spec !== '' ? ` - ${spec}` : '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Extract source marker [file#line] from first Step description attachment, or ''. */
function getFirstStepSourceMarker(attachments: TestResult['attachments']): string {
  const list = attachments ?? [];
  for (let i = 0; i < list.length; i++) {
    const att = list[i];
    if (
      att.name === STEP_DESCRIPTION_NAME &&
      (att.contentType === 'text/plain' || !att.contentType) &&
      att.body !== undefined
    ) {
      const body = typeof att.body === 'string' ? att.body : att.body.toString('utf-8');
      const match = body.trim().match(/^(\[[^\]]+\])\s*[–-]\s*/);
      return match !== null ? match[1] : '';
    }
  }
  return '';
}

/** Return only the label part (strip leading [file#line] – ). */
function stepDescriptionLabelOnly(body: string): string {
  const trimmed = body.trim();
  const match = trimmed.match(/^\[[^\]]+\]\s*[–-]\s*(.*)$/s);
  return match !== null ? match[1].trim() : trimmed;
}

/** Keep step labels as authored so hyphenated compound terms remain consistent in all sections. */
function humanizeStepLabel(label: string): string {
  return label.trim();
}

const USER_ROLE_ANNOTATION_TYPE = 'user-role';

/** Extract user context (role / CRUD permissions) from test result annotations for report display. */
function getUserContextFromResult(result: TestResult): string | null {
  const list = result.annotations ?? [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (
      a.type === USER_ROLE_ANNOTATION_TYPE &&
      a.description !== undefined &&
      a.description.trim() !== ''
    ) {
      return a.description.trim();
    }
  }
  return null;
}

/** Normalize user context string to a CSS-safe class suffix (lowercase, spaces/parens/colons -> hyphens). */
function userContextToClassSuffix(context: string): string {
  const normalized = context
    .trim()
    .toLowerCase()
    .replace(/[\s()]+/g, '-')
    .replace(/:/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized !== '' ? normalized : 'other';
}

/** Role prefixes for color (longest first so e.g. super-admin matches before admin). */
const ROLE_PREFIXES = [
  'super-admin',
  'bucket-admin',
  'admin',
  'basic-user',
  'bucket-owner',
  'unauthenticated',
] as const;

/** Return the role prefix for color; unknown contexts use "other". */
function getContextColorClassSuffix(context: string): string {
  const suffix = userContextToClassSuffix(context);
  for (const role of ROLE_PREFIXES) {
    if (suffix === role || suffix.startsWith(role + '-')) return role;
  }
  return 'other';
}

function normalizePathSlashes(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function extractE2ESegment(filePath: string): string | null {
  const normalized = normalizePathSlashes(filePath);
  const idx = normalized.lastIndexOf('/e2e/');
  if (idx >= 0) {
    return normalized.slice(idx + 1);
  }
  return normalized.startsWith('e2e/') ? normalized : null;
}

function getSpecPathCandidates(filePath: string, rootDir: string): string[] {
  if (filePath.trim() === '') {
    return [];
  }
  const unique = new Set<string>();
  const normalizedRaw = normalizePathSlashes(filePath);
  unique.add(normalizedRaw);

  const relativeFromRoot = normalizePathSlashes(
    path.relative(rootDir, path.resolve(rootDir, filePath))
  );
  if (relativeFromRoot !== '') {
    unique.add(relativeFromRoot);
  }

  const e2eFromRaw = extractE2ESegment(normalizedRaw);
  if (e2eFromRaw !== null) {
    unique.add(e2eFromRaw);
  }

  const e2eFromRelative = extractE2ESegment(relativeFromRoot);
  if (e2eFromRelative !== null) {
    unique.add(e2eFromRelative);
  }

  const basename = path.posix.basename(normalizedRaw);
  if (basename !== '') {
    unique.add(basename);
  }

  return Array.from(unique);
}

const UNKNOWN_SPEC_INDEX = 999999;

interface SpecOrderIndex {
  pathIndex: Map<string, number>;
  basenameIndex: Map<string, number>;
}

/**
 * Parse E2E_SPEC_ORDER (semicolon-separated) into lookup maps.
 * basenameIndex is populated only for unique basenames to avoid ambiguous matches.
 */
function buildSpecOrderIndex(orderEnv: string | undefined): SpecOrderIndex {
  const pathIndex = new Map<string, number>();
  const basenameCounts = new Map<string, number>();
  const basenameFirstIndex = new Map<string, number>();
  if (typeof orderEnv !== 'string' || orderEnv.trim() === '') {
    return {
      pathIndex,
      basenameIndex: new Map<string, number>(),
    };
  }

  const list = orderEnv
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (let i = 0; i < list.length; i += 1) {
    const key = normalizePathSlashes(list[i]);
    if (!pathIndex.has(key)) {
      pathIndex.set(key, i);
    }

    const basename = path.posix.basename(key);
    const count = basenameCounts.get(basename) ?? 0;
    basenameCounts.set(basename, count + 1);
    if (!basenameFirstIndex.has(basename)) {
      basenameFirstIndex.set(basename, i);
    }
  }

  const basenameIndex = new Map<string, number>();
  for (const [basename, count] of basenameCounts.entries()) {
    if (count === 1) {
      const firstIndex = basenameFirstIndex.get(basename);
      if (firstIndex !== undefined) {
        basenameIndex.set(basename, firstIndex);
      }
    }
  }

  return {
    pathIndex,
    basenameIndex,
  };
}

function getRunOrderIndex(run: CollectedRun, orderIndex: SpecOrderIndex, rootDir: string): number {
  const filePath = run.test.location?.file ?? '';
  const candidates = getSpecPathCandidates(filePath, rootDir);

  for (let i = 0; i < candidates.length; i += 1) {
    const pathMatch = orderIndex.pathIndex.get(candidates[i]);
    if (pathMatch !== undefined) {
      return pathMatch;
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const basename = path.posix.basename(candidates[i]);
    const basenameMatch = orderIndex.basenameIndex.get(basename);
    if (basenameMatch !== undefined) {
      return basenameMatch;
    }
  }

  return UNKNOWN_SPEC_INDEX;
}

/** Reorder runs by E2E_SPEC_ORDER so the report displays in conceptual order. Stable sort. */
function reorderRunsBySpecOrder(
  runs: CollectedRun[],
  orderIndex: SpecOrderIndex,
  rootDir: string
): void {
  if (orderIndex.pathIndex.size === 0 && orderIndex.basenameIndex.size === 0) {
    return;
  }

  runs.sort((a, b) => {
    const ia = getRunOrderIndex(a, orderIndex, rootDir);
    const ib = getRunOrderIndex(b, orderIndex, rootDir);
    return ia !== ib ? ia - ib : 0;
  });
}

/** True for repetitive "redirect to login" tests that are collapsed by default in the report (summary only). */
function isRedirectToLoginTest(test: TestCase): boolean {
  const title = test.title.trim().toLowerCase();
  return (
    title === 'unauthenticated user is redirected to login' ||
    title === 'redirects unauthenticated users to login' ||
    title.includes('redirected to the login page') ||
    title.includes('redirects unauthenticated users to login')
  );
}

interface CollectedStep {
  imgSrc: string;
  stepLabelOnly: string;
  stepUrl?: string;
}

function normalizeStepLabel(label: string): string {
  return label.trim().toLowerCase();
}

function isValidationStepLabel(label: string): boolean {
  const normalized = normalizeStepLabel(label);
  if (normalized === '') {
    return false;
  }
  return (
    normalized.includes('expect') ||
    normalized.includes('is visible') ||
    normalized.includes('is shown') ||
    normalized.includes('is fully rendered') ||
    normalized.includes('loads') ||
    normalized.includes('render') ||
    normalized.includes('redirect') ||
    normalized.includes('shows ') ||
    normalized.includes('sees ') ||
    normalized.includes('stays on') ||
    normalized.includes('remains on') ||
    normalized.includes('not found') ||
    normalized.includes('error') ||
    normalized.includes('success')
  );
}

function isNavigationOnlyStepLabel(label: string): boolean {
  const normalized = normalizeStepLabel(label);
  if (normalized === '') {
    return false;
  }
  const hasNavigationVerb =
    normalized.includes('navigate') ||
    normalized.includes('opens ') ||
    normalized.includes('open ') ||
    normalized.includes('goes to') ||
    normalized.includes('visits ');
  if (!hasNavigationVerb) {
    return false;
  }
  const hasActionVerb =
    normalized.includes('fills ') ||
    normalized.includes('clicks ') ||
    normalized.includes('submits ') ||
    normalized.includes('saves ') ||
    normalized.includes('deletes ') ||
    normalized.includes('edits ');
  return !hasActionVerb;
}

function shouldHideNavigationOnlyImage(steps: CollectedStep[], stepIndex: number): boolean {
  const step = steps[stepIndex];
  if (step === undefined || !isNavigationOnlyStepLabel(step.stepLabelOnly)) {
    return false;
  }
  for (let i = stepIndex + 1; i < steps.length; i++) {
    if (isValidationStepLabel(steps[i]?.stepLabelOnly ?? '')) {
      return true;
    }
  }
  return false;
}

/** Human-readable status label used consistently in summary and section. */
function statusDisplayLabel(status: string): string {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  if (status === 'timedOut') return 'timed out';
  return 'failed';
}

export default class HtmlStepsReporter implements Reporter {
  private outputDir: string = 'playwright-report';
  private rootDir: string = process.cwd();
  private runs: CollectedRun[] = [];

  constructor(options: ReporterOptions = {}) {
    const envDir = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR;
    this.outputDir =
      options.outputFolder ??
      (typeof envDir === 'string' && envDir.trim() !== '' ? envDir.trim() : 'playwright-report');
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.rootDir = config.rootDir;
    const attachmentsDir = path.join(this.outputDir, 'attachments');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.runs.push({ test, result });
  }

  async onEnd(result: FullResult): Promise<void> {
    const orderIndex = buildSpecOrderIndex(process.env.E2E_SPEC_ORDER);
    reorderRunsBySpecOrder(this.runs, orderIndex, this.rootDir);

    const attachmentsDir = path.join(this.outputDir, 'attachments');
    const parts: string[] = [];
    const isInterrupted = result.status === 'interrupted';

    const normalizedDir = this.outputDir.replace(/\\/g, '/');
    const scopedSpecSuffix = getScopedSpecSuffix();
    const reportTitle = normalizedDir.endsWith('/management-web')
      ? `E2E Management Web Report${scopedSpecSuffix}`
      : normalizedDir.endsWith('/web-signup-enabled')
        ? `E2E Web Report – AUTH_MODE=user_signup_email, MAILER_ENABLED=true${scopedSpecSuffix}`
        : normalizedDir.endsWith('/web-admin-only-email')
          ? `E2E Web Report – AUTH_MODE=admin_only_email${scopedSpecSuffix}`
          : normalizedDir.endsWith('/web')
            ? `E2E Web Report${scopedSpecSuffix}`
            : 'E2E step report';

    const passed = this.runs.filter((r) => r.result.status === 'passed').length;
    const skipped = this.runs.filter((r) => r.result.status === 'skipped').length;
    const failed = this.runs.filter((r) => r.result.status === 'failed').length;
    const timedOut = this.runs.filter((r) => r.result.status === 'timedOut').length;
    const total = this.runs.length;

    parts.push(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      /* Colors */
      --report-bg: #1e1e1e;
      --report-text: #d4d4d4;
      --report-border: #444;
      --report-link: #9cdcfe;
      --report-pass: #4ec9b0;
      --report-fail: #f48771;
      --report-timeout: #dcdcaa;
      --report-skip: #888;
      --report-warning-bg: #3d3d2d;
      --report-warning-text: #dcdcaa;
      --report-surface: #2d2d2d;
      --report-surface-hover: #3d3d3d;
      --report-error-text: #ce9178;
      --report-muted: #888;
      /* Spacing (rem) */
      --report-space-xs: 0.25rem;
      --report-space-sm: 0.5rem;
      --report-space-md: 0.75rem;
      --report-space-lg: 1rem;
      --report-space-xl: 1.5rem;
      --report-space-2xl: 2rem;
      /* Font size scale (base = 1rem) */
      --report-font-xs: 0.86rem;
      --report-font-sm: 0.92rem;
      --report-font-md: 0.96rem;
      --report-font-base: 1rem;
      --report-font-lg: 1.11rem;
      --report-font-section: 1.15rem;
      --report-font-title: 1.30rem;
      /* Layout */
      --report-radius-sm: 4px;
      --report-radius-md: 6px;
      --report-max-width: 900px;
    }
    body { font-family: system-ui, sans-serif; margin: var(--report-space-lg); background: var(--report-bg); color: var(--report-text); }
    h1 { font-size: var(--report-font-title); margin-bottom: var(--report-space-lg); }
    .incomplete-banner { margin-bottom: var(--report-space-xl); padding: var(--report-space-lg); border: 1px solid var(--report-warning-text); border-radius: var(--report-radius-md); background: var(--report-warning-bg); color: var(--report-warning-text); font-weight: 600; }
    h2.section-heading { font-size: var(--report-font-section); font-weight: 600; margin: 0 0 var(--report-space-sm); }
    .summary { margin-bottom: var(--report-space-xl); padding: var(--report-space-lg); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); }
    .summary-stats { font-size: var(--report-font-sm); margin-bottom: var(--report-space-md); }
    .summary-list { list-style: none; padding: 0; margin: 0; }
    .summary-list a { color: var(--report-link); text-decoration: none; }
    .summary-list a:hover { text-decoration: underline; }
    .summary-list .prefix-pass { color: var(--report-pass); }
    .summary-list .prefix-skip { color: var(--report-skip); }
    .summary-list .prefix-error { color: var(--report-fail); }
    .summary-list .prefix-timeout { color: var(--report-timeout); }
    .summary-list .summary-group-header { list-style: none; margin-top: var(--report-space-lg); margin-bottom: var(--report-space-xs); font-weight: 600; font-size: var(--report-font-md); color: var(--report-text); }
    .summary-list .summary-group-header:first-child { margin-top: 0; }
    section.test { margin-bottom: var(--report-space-2xl); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); padding: var(--report-space-lg) var(--report-space-lg) 0 var(--report-space-lg); scroll-margin-top: var(--report-space-sm); max-width: var(--report-max-width); width: 100%; }
    section.test h2 { font-size: var(--report-font-base); margin: 0 0 var(--report-space-xs); font-weight: 600; }
    .test-describe { font-size: var(--report-font-sm); color: var(--report-muted); margin: 0 0 var(--report-space-xs); }
    .test-source-marker { font-size: var(--report-font-xs); color: var(--report-muted); margin: 0 0 var(--report-space-xs); }
    .status { font-size: var(--report-font-sm); margin-bottom: var(--report-space-xs); }
    .status.passed { color: var(--report-pass); }
    .status.skipped { color: var(--report-skip); }
    .status.failed { color: var(--report-fail); }
    .status.timedout { color: var(--report-timeout); }
    .error { background: var(--report-surface); padding: var(--report-space-md); border-radius: var(--report-radius-sm); margin-bottom: var(--report-space-lg); font-size: var(--report-font-sm); color: var(--report-error-text); white-space: pre-wrap; }
    .step-block { margin-bottom: var(--report-space-lg); }
    .step-block .step-content { width: 100%; }
    .step-block a.step-image-link { display: inline-block; margin-top: var(--report-space-sm); }
    .step-block img { width: 100%; height: auto; border: 1px solid var(--report-border); border-radius: var(--report-radius-sm); display: block; cursor: zoom-in; }
    .step-description-hr { margin: var(--report-space-lg) 0; border: 0; border-top: 1px solid var(--report-border); }
    .step-block .step-description { margin-bottom: var(--report-space-sm); }
    .step-block .step-description .step-description-text { margin: 0; padding: 0; background: transparent; font-size: var(--report-font-xs); overflow-x: auto; white-space: pre-wrap; text-indent: 0; }
    .step-block .step-description .step-url { margin-top: var(--report-space-xs); font-size: var(--report-font-xs); word-break: break-all; }
    .test-user-context { font-size: var(--report-font-sm); margin: 0 0 var(--report-space-xs); }
    .test-user-context-unset { font-style: italic; color: var(--report-muted); }
    .test-user-context-value-unauthenticated { color: #b8b8c0; }
    .test-user-context-value-basic-user { color: #e89850; }
    .test-user-context-value-bucket-owner { color: #f0dc78; }
    .test-user-context-value-bucket-admin { color: #c8d878; }
    .test-user-context-value-super-admin { color: #d8b0e8; }
    .test-user-context-value-admin { color: #c0a8e0; }
    .test-user-context-value-other { color: #e0b070; }
    .nav-wrapper { position: fixed; bottom: var(--report-space-lg); right: var(--report-space-lg); display: flex; flex-direction: column; align-items: flex-end; gap: var(--report-space-sm); z-index: 10; }
    .nav-end-message { font-size: var(--report-font-sm); color: var(--report-text-muted, #666); display: none; }
    .nav-end-message.visible { display: block; }
    .nav-buttons { display: flex; flex-direction: column; gap: var(--report-space-sm); }
    .nav-buttons button { padding: var(--report-space-sm) var(--report-space-md); font-size: var(--report-font-sm); cursor: pointer; border: 1px solid var(--report-border); border-radius: var(--report-radius-md); background: var(--report-surface); color: var(--report-text); min-height: 2.25rem; min-width: 82px; box-sizing: border-box; }
    .nav-buttons button:hover { background: var(--report-surface-hover); }
    .nav-row { display: flex; gap: var(--report-space-sm); }
    .nav-row-prev { margin-bottom: var(--report-space-md); }
    .test-index-indicator { position: fixed; top: var(--report-space-md); right: var(--report-space-md); z-index: 10; font-size: var(--report-font-sm); padding: var(--report-space-sm) var(--report-space-md); background: var(--report-surface); color: var(--report-text); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); }
  </style>
</head>
<body>
  <div id="test-index-indicator" class="test-index-indicator" aria-live="polite" role="status">— / —</div>
  <h1>${escapeHtml(reportTitle)}</h1>
${isInterrupted ? '  <div class="incomplete-banner">Run aborted during execution; this report is incomplete.</div>\n' : ''}
  <h2 class="section-heading">Test summary</h2>
  <div class="summary">
    <div class="summary-stats">${total} test${total === 1 ? '' : 's'}: ${passed} passed${skipped > 0 ? `, ${skipped} skipped` : ''}, ${failed} failed${timedOut > 0 ? `, ${timedOut} timed out` : ''}</div>
    <ul class="summary-list">
`);
    let lastGroupName: string | null = null;
    for (let testIndex = 0; testIndex < this.runs.length; testIndex++) {
      const { test, result } = this.runs[testIndex];
      const path = test.titlePath();
      const groupName =
        path.length >= 2 ? path[path.length - 2] : path.length >= 1 ? path[0] : 'Tests';
      if (groupName !== lastGroupName) {
        lastGroupName = groupName;
        parts.push(`      <li class="summary-group-header">${escapeHtml(groupName)}</li>
`);
      }
      const status = result.status ?? 'unknown';
      const prefixClass =
        status === 'passed'
          ? 'prefix-pass'
          : status === 'skipped'
            ? 'prefix-skip'
            : status === 'timedOut'
              ? 'prefix-timeout'
              : 'prefix-error';
      const prefixText = statusDisplayLabel(status);
      const isRedirectToLogin = isRedirectToLoginTest(test);
      const userContext = getUserContextFromResult(result);
      const colorSuffix = userContext !== null ? getContextColorClassSuffix(userContext) : '';
      const titleSuffix =
        userContext !== null
          ? ` <span class="test-user-context-value test-user-context-value-${colorSuffix}">(${escapeHtml(userContext)})</span>`
          : '';
      const testNumber = testIndex + 1;
      if (isRedirectToLogin) {
        parts.push(`      <li><span class="${escapeHtml(prefixClass)}">${escapeHtml(prefixText)}:</span> ${testNumber}) ${escapeHtml(test.title)}${titleSuffix}</li>
`);
      } else {
        parts.push(`      <li><span class="${escapeHtml(prefixClass)}">${escapeHtml(prefixText)}:</span> ${testNumber}) <a href="#test-${testIndex}">${escapeHtml(test.title)}</a>${titleSuffix}</li>
`);
      }
    }
    parts.push(`    </ul>
  </div>
  <h2 class="section-heading">Screenshots and step descriptions</h2>
`);

    let shotIndex = 0;
    for (let testIndex = 0; testIndex < this.runs.length; testIndex++) {
      const { test, result } = this.runs[testIndex];
      if (isRedirectToLoginTest(test)) {
        continue;
      }
      const statusClass = result.status ?? 'unknown';
      const titlePath = test.titlePath();
      const projectOrFile = (s: string): boolean =>
        s.endsWith('.spec.ts') ||
        ['chromium', 'firefox', 'webkit'].includes(s.trim().toLowerCase());
      const contextSegments = titlePath
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !projectOrFile(s));
      const describeLabel = contextSegments.length >= 2 ? contextSegments[0] : '';
      const firstSourceMarker = getFirstStepSourceMarker(result.attachments);
      const userContext = getUserContextFromResult(result);
      const colorSuffix = userContext !== null ? getContextColorClassSuffix(userContext) : '';
      const userContextLine =
        userContext !== null
          ? `    <div class="test-user-context">User context: <span class="test-user-context-value test-user-context-value-${colorSuffix}">${escapeHtml(userContext)}</span></div>\n`
          : `    <div class="test-user-context test-user-context-unset">User context: (not set)</div>\n`;
      parts.push(`  <section id="test-${testIndex}" class="test" data-test-index="${testIndex}" data-status="${escapeHtml(statusClass)}">
${describeLabel !== '' ? `    <div class="test-describe">${escapeHtml(describeLabel)}</div>\n` : ''}    <h2>${escapeHtml(test.title)}</h2>
${firstSourceMarker !== '' ? `    <div class="test-source-marker">${escapeHtml(firstSourceMarker)}</div>\n` : ''}${userContextLine}    <div class="status ${escapeHtml(statusClass)}">${escapeHtml(statusDisplayLabel(statusClass))}</div>
`);
      if (result.error?.message) {
        parts.push(`    <div class="error">${escapeHtml(result.error.message)}</div>
`);
      }

      const attachments = result.attachments ?? [];
      const collectedSteps: CollectedStep[] = [];
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.contentType !== 'image/png' || !att.path) {
          continue;
        }
        const srcPath = path.isAbsolute(att.path) ? att.path : path.resolve(this.rootDir, att.path);
        const ext = path.extname(att.path) || '.png';
        const destName = `test-${testIndex}-step-${i}${ext}`;
        const destPath = path.join(attachmentsDir, destName);
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch {
          // If copy fails (e.g. path from worker), skip image
          continue;
        }
        const imgSrc = `attachments/${destName}`;
        const next = attachments[i + 1];
        let stepDescription = '';
        if (
          next &&
          next.name === STEP_DESCRIPTION_NAME &&
          (next.contentType === 'text/plain' || !next.contentType)
        ) {
          stepDescription =
            next.body !== undefined
              ? typeof next.body === 'string'
                ? next.body
                : next.body.toString('utf-8')
              : '';
          stepDescription = stepDescription.trim();
          i++; // consume the Step description attachment
        }
        let stepUrl: string | undefined;
        const urlAtt = attachments[i + 1];
        if (
          urlAtt &&
          urlAtt.name === STEP_URL_NAME &&
          (urlAtt.contentType === 'text/plain' || !urlAtt.contentType) &&
          urlAtt.body !== undefined
        ) {
          stepUrl = typeof urlAtt.body === 'string' ? urlAtt.body : urlAtt.body.toString('utf-8');
          stepUrl = stepUrl.trim();
          if (stepUrl !== '') {
            i++; // consume the Step URL attachment
          } else {
            stepUrl = undefined;
          }
        }
        const stepLabelOnly =
          stepDescription !== ''
            ? humanizeStepLabel(stepDescriptionLabelOnly(stepDescription))
            : '';
        collectedSteps.push({ imgSrc, stepLabelOnly, stepUrl });
      }

      for (let stepIndex = 0; stepIndex < collectedSteps.length; stepIndex++) {
        const step = collectedSteps[stepIndex];
        if (shouldHideNavigationOnlyImage(collectedSteps, stepIndex)) {
          continue;
        }
        let stepDescriptionHtml = escapeHtml(step.stepLabelOnly);
        if (step.stepLabelOnly !== '' && userContext !== null && colorSuffix !== '') {
          const escapedContext = escapeHtml(userContext);
          stepDescriptionHtml = stepDescriptionHtml
            .split(escapedContext)
            .join(
              `<span class="test-user-context-value test-user-context-value-${colorSuffix}">${escapedContext}</span>`
            );
        }
        parts.push(`    <hr class="step-description-hr">
    <div class="step-block" data-shot-index="${shotIndex}">
    <div class="step-content">
${
  step.stepLabelOnly !== ''
    ? `    <div class="step-description">
    <div class="step-description-text">${stepDescriptionHtml}</div>
${
  step.stepUrl
    ? `    <div class="step-url">URL: <a href="${escapeHtml(step.stepUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(step.stepUrl)}</a></div>
`
    : ''
}
    </div>
`
    : ''
}
    <a class="step-image-link" href="${escapeHtml(step.imgSrc)}" target="_blank" rel="noopener noreferrer">
    <img src="${escapeHtml(step.imgSrc)}" alt="Step screenshot">
    </a>
    </div>
`);
        parts.push(`    </div>
`);
        shotIndex++;
      }

      parts.push(`  </section>
`);
    }

    parts.push(`  <div class="nav-wrapper">
  <div id="nav-end-message" class="nav-end-message" role="status" aria-live="polite">End of list</div>
  <div class="nav-buttons" aria-label="Report navigation">
    <div class="nav-row nav-row-prev">
      <button type="button" id="nav-top" title="Top">\u2191</button>
      <button type="button" id="nav-prev-shot" title="Prev Shot">\u2191 Shot</button>
      <button type="button" id="nav-prev-test" title="Prev Test">\u2191 Test</button>
      <button type="button" id="nav-prev-error" title="Prev Error">\u2191 Error</button>
    </div>
    <div class="nav-row">
      <button type="button" id="nav-bottom" title="Bottom">\u2193</button>
      <button type="button" id="nav-next-shot" title="Next Shot">\u2193 Shot</button>
      <button type="button" id="nav-next-test" title="Next Test">\u2193 Test</button>
      <button type="button" id="nav-next-error" title="Next Error">\u2193 Error</button>
    </div>
  </div>
  </div>
  <script>
    (function () {
      var testSections = document.querySelectorAll('section.test');
      var errorSections = document.querySelectorAll('section.test[data-status="failed"], section.test[data-status="timedOut"]');
      var endMessage = document.getElementById('nav-end-message');
      var testIndexIndicator = document.getElementById('test-index-indicator');
      function updateTestIndexIndicator() {
        if (!testIndexIndicator) return;
        var total = testSections.length;
        if (total === 0) {
          testIndexIndicator.textContent = '0 / 0';
          return;
        }
        var currentIndex = findCurrentIndex(testSections);
        var displayNum = currentIndex < 0 ? 1 : currentIndex + 1;
        testIndexIndicator.textContent = displayNum + ' / ' + total;
      }
      function findCurrentIndex(elements) {
        var viewportTop = window.scrollY + 80;
        var currentIndex = -1;
        for (var j = 0; j < elements.length; j++) {
          var top = elements[j].getBoundingClientRect().top + window.scrollY;
          if (top <= viewportTop) currentIndex = j;
        }
        return currentIndex;
      }
      function findNext(elements) {
        if (elements.length === 0) return null;
        var currentIndex = findCurrentIndex(elements);
        var nextIndex = currentIndex + 1;
        if (nextIndex >= elements.length) nextIndex = 0;
        return elements[nextIndex];
      }
      function findNextNoWrap(elements) {
        if (elements.length === 0) return null;
        var currentIndex = findCurrentIndex(elements);
        var nextIndex = currentIndex + 1;
        if (nextIndex >= elements.length) return null;
        return elements[nextIndex];
      }
      function findPrevNoWrap(elements) {
        if (elements.length === 0) return null;
        var currentIndex = findCurrentIndex(elements);
        var prevIndex = currentIndex - 1;
        if (prevIndex < 0) return null;
        return elements[prevIndex];
      }
      function findNextByTopNoWrap(elements, offsetPx) {
        if (elements.length === 0) return null;
        var threshold = window.scrollY + (offsetPx || 0) + 2;
        for (var j = 0; j < elements.length; j++) {
          var top = elements[j].getBoundingClientRect().top + window.scrollY;
          if (top > threshold) return elements[j];
        }
        return null;
      }
      function findPrevByTopNoWrap(elements, offsetPx) {
        if (elements.length === 0) return null;
        var threshold = window.scrollY + (offsetPx || 0) - 2;
        for (var j = elements.length - 1; j >= 0; j--) {
          var top = elements[j].getBoundingClientRect().top + window.scrollY;
          if (top < threshold) return elements[j];
        }
        return null;
      }
      var SHOT_OFFSET_PX = 140;
      var shotBlocks = document.querySelectorAll('.step-block[data-shot-index]');
      function findNextShotAhead() {
        var threshold = window.scrollY + SHOT_OFFSET_PX + 2;
        for (var k = 0; k < shotBlocks.length; k++) {
          var top = shotBlocks[k].getBoundingClientRect().top + window.scrollY;
          if (top > threshold) return shotBlocks[k];
        }
        return null;
      }
      function findPrevShotBehind() {
        var threshold = window.scrollY + SHOT_OFFSET_PX - 2;
        for (var k = shotBlocks.length - 1; k >= 0; k--) {
          var top = shotBlocks[k].getBoundingClientRect().top + window.scrollY;
          if (top < threshold) return shotBlocks[k];
        }
        return null;
      }
      function scrollToShot(el) {
        if (!el) return;
        var top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top - SHOT_OFFSET_PX, behavior: 'auto' });
      }
      function scrollTo(el) {
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      var endMessageTimeout;
      function showEndMessage() {
        endMessage.classList.add('visible');
        if (endMessageTimeout) clearTimeout(endMessageTimeout);
        endMessageTimeout = setTimeout(function () { hideEndMessage(); endMessageTimeout = null; }, 3000);
      }
      function hideEndMessage() { endMessage.classList.remove('visible'); if (endMessageTimeout) { clearTimeout(endMessageTimeout); endMessageTimeout = null; } }
      document.getElementById('nav-top').addEventListener('click', function () { hideEndMessage(); window.scrollTo({ top: 0, behavior: 'auto' }); });
      document.getElementById('nav-bottom').addEventListener('click', function () { hideEndMessage(); window.scrollTo({ top: document.documentElement.scrollHeight - window.innerHeight, behavior: 'auto' }); });
      document.getElementById('nav-prev-shot').addEventListener('click', function () {
        var prevShot = findPrevShotBehind();
        if (prevShot !== null) {
          hideEndMessage();
          scrollToShot(prevShot);
          return;
        }
        var prevTest = findPrevByTopNoWrap(testSections, 0);
        if (prevTest !== null) {
          hideEndMessage();
          scrollTo(prevTest);
          return;
        }
        showEndMessage();
      });
      document.getElementById('nav-prev-test').addEventListener('click', function () {
        var prev = findPrevNoWrap(testSections);
        if (prev) { hideEndMessage(); scrollTo(prev); } else { showEndMessage(); }
      });
      document.getElementById('nav-prev-error').addEventListener('click', function () {
        var prev = findPrevNoWrap(errorSections);
        if (prev) { hideEndMessage(); scrollTo(prev); } else { showEndMessage(); }
      });
      document.getElementById('nav-next-shot').addEventListener('click', function () {
        var nextShot = findNextShotAhead();
        if (nextShot !== null) {
          hideEndMessage();
          scrollToShot(nextShot);
          return;
        }
        var nextTest = findNextByTopNoWrap(testSections, 0);
        if (nextTest !== null) {
          hideEndMessage();
          scrollTo(nextTest);
          return;
        }
        showEndMessage();
      });
      document.getElementById('nav-next-test').addEventListener('click', function () {
        var next = findNextNoWrap(testSections);
        if (next) { hideEndMessage(); scrollTo(next); } else { showEndMessage(); }
      });
      document.getElementById('nav-next-error').addEventListener('click', function () {
        var next = findNextNoWrap(errorSections);
        if (next) { hideEndMessage(); scrollTo(next); } else { showEndMessage(); }
      });
      updateTestIndexIndicator();
      window.addEventListener('scroll', updateTestIndexIndicator);
    })();
  </script>
</body>
</html>
`);

    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, parts.join(''), 'utf-8');
  }
}
