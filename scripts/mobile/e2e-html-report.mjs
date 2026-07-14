#!/usr/bin/env node
/**
 * Build web-parity step/screenshot HTML for mobile Maestro runs.
 * Usage: node scripts/mobile/e2e-html-report.mjs <report-root-dir>
 *
 * Report layout (one HTML report per OS + form-factor slot):
 *   <report-root>/
 *     index.html                 # hub linking all slots
 *     ios-phone/index.html
 *     android-phone/index.html
 *     ios-tablet/index.html      # when that slot is run
 *     android-tablet/index.html
 *
 * Matches the web E2E report chrome (summary, failed sections, Shot/Test/Error nav).
 */

import fs from 'fs';
import path from 'path';

const reportRoot = process.argv[2];
if (!reportRoot) {
  console.error('Usage: node scripts/mobile/e2e-html-report.mjs <report-root-dir>');
  process.exit(1);
}

/** Ordered slots: OS + form factor. Create reports only for dirs that exist. */
const SLOT_META = [
  { id: 'ios-phone', label: 'iOS phone', os: 'ios', form: 'phone' },
  { id: 'android-phone', label: 'Android phone', os: 'android', form: 'phone' },
  { id: 'ios-tablet', label: 'iOS tablet', os: 'ios', form: 'tablet' },
  { id: 'android-tablet', label: 'Android tablet', os: 'android', form: 'tablet' },
];

/** Legacy dirs from earlier runners map into phone slots. */
const LEGACY_DIR_TO_SLOT = {
  ios: 'ios-phone',
  android: 'android-phone',
};

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function walkFiles(dir, baseRel = '') {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(baseRel, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs, rel));
      continue;
    }
    out.push(rel.split(path.sep).join('/'));
  }
  return out;
}

function commandLabel(command) {
  if (!command || typeof command !== 'object') {
    return 'command';
  }
  const keys = Object.keys(command);
  if (keys.length === 0) {
    return 'command';
  }
  const key = keys[0];
  const body = command[key];
  if (key === 'assertConditionCommand') {
    const visible = body?.condition?.visible;
    if (visible?.idRegex) {
      return `assertVisible id=${visible.idRegex}`;
    }
    if (visible?.textRegex) {
      return `assertVisible text=${visible.textRegex}`;
    }
    return 'assertVisible';
  }
  if (key === 'takeScreenshotCommand') {
    return `takeScreenshot ${body?.path ?? body?.fileName ?? ''}`.trim();
  }
  if (key === 'launchAppCommand') {
    return `launchApp${body?.clearState ? ' clearState' : ''}`;
  }
  if (key === 'tapOnElementCommand' || key === 'tapOnPointCommand') {
    const text = body?.selector?.textRegex ?? body?.selector?.idRegex ?? '';
    return `tapOn ${text}`.trim();
  }
  if (key === 'openLinkCommand') {
    return `openLink ${body?.link ?? ''}`.trim();
  }
  if (key === 'extendedWaitUntilCommand') {
    const visible = body?.condition?.visible;
    const id = visible?.idRegex ?? visible?.textRegex ?? '';
    return `extendedWaitUntil ${id}`.trim();
  }
  if (key === 'runFlowCommand') {
    return `runFlow ${body?.fileName ?? body?.sourceDescription ?? ''}`.trim();
  }
  if (key === 'stopAppCommand') {
    return 'stopApp';
  }
  return key.replace(/Command$/, '');
}

function statusFromMeta(status) {
  const raw = String(status ?? 'unknown').toUpperCase();
  if (raw === 'COMPLETED' || raw === 'PASSED' || raw === 'SUCCESS') {
    return 'passed';
  }
  if (raw === 'FAILED' || raw === 'ERROR') {
    return 'failed';
  }
  if (raw === 'SKIPPED' || raw === 'WARNED') {
    return 'skipped';
  }
  if (raw.includes('TIMEOUT')) {
    return 'timedOut';
  }
  return 'unknown';
}

function statusDisplayLabel(status) {
  if (status === 'passed') return 'Passed';
  if (status === 'failed') return 'Failed';
  if (status === 'skipped') return 'Skipped';
  if (status === 'timedOut') return 'Timed out';
  return status;
}

/**
 * Collect screenshot names from takeScreenshot commands (nested runFlow included).
 */
function collectTakeScreenshotNames(commands, into = new Set()) {
  if (!Array.isArray(commands)) {
    return into;
  }
  for (const entry of commands) {
    const command = entry?.command;
    if (!command || typeof command !== 'object') {
      continue;
    }
    const take = command.takeScreenshotCommand;
    if (take && typeof take === 'object') {
      const raw = take.path ?? take.fileName;
      if (typeof raw === 'string' && raw.trim() !== '') {
        into.add(path.basename(raw.trim()));
      }
    }
    const runFlow = command.runFlowCommand;
    if (runFlow && typeof runFlow === 'object' && Array.isArray(runFlow.commands)) {
      collectTakeScreenshotNames(runFlow.commands, into);
    }
  }
  return into;
}

/**
 * Maestro writes:
 * - named takeScreenshot PNGs under <slot>/screenshots/<name>.png
 * - failure dumps under the per-run dir (…/screenshot-❌-….png)
 * Match both so passed and failed runs show images in the slot HTML.
 */
function collectImagesForFlow(files, runDir, commands) {
  const namedShots = collectTakeScreenshotNames(commands);
  const seen = new Set();
  const images = [];

  function addImage(rel) {
    const normalized = rel.split(path.sep).join('/');
    if (seen.has(normalized)) {
      return;
    }
    if (!IMAGE_EXT.has(path.extname(normalized).toLowerCase())) {
      return;
    }
    seen.add(normalized);
    images.push({
      rel: normalized,
      base: path.basename(normalized, path.extname(normalized)),
      isFailure: normalized.includes('❌') || normalized.toLowerCase().includes('fail'),
    });
  }

  for (const rel of files) {
    const inRunDir = runDir === '.' || rel.startsWith(`${runDir}/`);
    if (inRunDir) {
      addImage(rel);
    }
  }

  for (const rel of files) {
    const base = path.basename(rel, path.extname(rel));
    if (namedShots.has(base)) {
      addImage(rel);
    }
  }

  // Fallback: slot-level screenshots/ when commands omit path metadata but files exist.
  if (images.length === 0) {
    for (const rel of files) {
      if (rel.startsWith('screenshots/')) {
        addImage(rel);
      }
    }
  }

  images.sort((a, b) => a.rel.localeCompare(b.rel));
  return images;
}

function loadFlowsFromSlot(slotDir) {
  const files = walkFiles(slotDir);
  const commandFiles = files.filter(
    (rel) => path.basename(rel).startsWith('commands-') && rel.endsWith('.json')
  );
  const flows = [];

  for (const commandsRel of commandFiles) {
    const abs = path.join(slotDir, commandsRel);
    let commands;
    try {
      commands = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(commands)) {
      continue;
    }

    const runDir = path.dirname(commandsRel);
    const flowNameMatch = path.basename(commandsRel).match(/^commands-\((.+)\)\.json$/);
    const title = flowNameMatch !== null ? flowNameMatch[1] : path.basename(runDir);

    const images = collectImagesForFlow(files, runDir === '.' ? '.' : runDir, commands);

    let flowStatus = 'passed';
    let errorMessage = '';
    const steps = [];

    for (const entry of commands) {
      const meta = entry?.metadata ?? {};
      const status = statusFromMeta(meta.status);
      if (status === 'failed' || status === 'timedOut') {
        flowStatus = status;
        const msg = meta.error?.message;
        if (typeof msg === 'string' && msg.trim() !== '') {
          errorMessage = msg.trim();
        }
      }
      const skipKeys = new Set(['defineVariablesCommand', 'applyConfigurationCommand']);
      const cmdKey = entry?.command ? Object.keys(entry.command)[0] : '';
      if (skipKeys.has(cmdKey)) {
        continue;
      }
      steps.push({
        label: commandLabel(entry.command),
        status,
      });
    }

    if (images.some((img) => img.isFailure) && flowStatus === 'passed') {
      flowStatus = 'failed';
    }

    flows.push({
      title,
      status: flowStatus,
      errorMessage,
      steps,
      images,
      commandsRel,
    });
  }

  flows.sort((a, b) => a.title.localeCompare(b.title));
  return flows;
}

function reportSharedCss() {
  return `
    :root {
      --report-bg: #1e1e1e;
      --report-text: #d4d4d4;
      --report-border: #444;
      --report-link: #9cdcfe;
      --report-pass: #4ec9b0;
      --report-fail: #f48771;
      --report-timeout: #dcdcaa;
      --report-skip: #888;
      --report-surface: #2d2d2d;
      --report-surface-hover: #3d3d3d;
      --report-error-text: #ce9178;
      --report-muted: #888;
      --report-space-xs: 0.25rem;
      --report-space-sm: 0.5rem;
      --report-space-md: 0.75rem;
      --report-space-lg: 1rem;
      --report-space-xl: 1.5rem;
      --report-space-2xl: 2rem;
      --report-font-xs: 0.86rem;
      --report-font-sm: 0.92rem;
      --report-font-md: 0.96rem;
      --report-font-base: 1rem;
      --report-font-section: 1.15rem;
      --report-font-title: 1.30rem;
      --report-radius-sm: 4px;
      --report-radius-md: 6px;
      --report-max-width: 900px;
    }
    body { font-family: system-ui, sans-serif; margin: var(--report-space-lg); background: var(--report-bg); color: var(--report-text); }
    h1 { font-size: var(--report-font-title); margin-bottom: var(--report-space-lg); }
    h2.section-heading { font-size: var(--report-font-section); font-weight: 600; margin: 0 0 var(--report-space-sm); }
    a { color: var(--report-link); }
    .summary { margin-bottom: var(--report-space-xl); padding: var(--report-space-lg); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); }
    .summary-stats { font-size: var(--report-font-sm); margin-bottom: var(--report-space-md); }
    .summary-list { list-style: none; padding: 0; margin: 0; }
    .summary-list a { text-decoration: none; }
    .summary-list a:hover { text-decoration: underline; }
    .summary-list .prefix-pass { color: var(--report-pass); }
    .summary-list .prefix-skip { color: var(--report-skip); }
    .summary-list .prefix-error { color: var(--report-fail); }
    .summary-list .prefix-timeout { color: var(--report-timeout); }
    section.test { margin-bottom: var(--report-space-2xl); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); padding: var(--report-space-lg) var(--report-space-lg) 0 var(--report-space-lg); scroll-margin-top: var(--report-space-sm); max-width: var(--report-max-width); width: 100%; }
    section.test h2 { font-size: var(--report-font-base); margin: 0 0 var(--report-space-xs); font-weight: 600; }
    .status { font-size: var(--report-font-sm); margin-bottom: var(--report-space-xs); }
    .status.passed { color: var(--report-pass); }
    .status.skipped { color: var(--report-skip); }
    .status.failed { color: var(--report-fail); }
    .status.timedout { color: var(--report-timeout); }
    .error { background: var(--report-surface); padding: var(--report-space-md); border-radius: var(--report-radius-sm); margin-bottom: var(--report-space-lg); font-size: var(--report-font-sm); color: var(--report-error-text); white-space: pre-wrap; }
    .step-list { font-size: var(--report-font-xs); margin: 0 0 var(--report-space-lg); padding-left: 1.25rem; color: var(--report-muted); }
    .step-list .step-failed { color: var(--report-fail); }
    .step-block { margin-bottom: var(--report-space-lg); }
    .step-block a.step-image-link { display: inline-block; margin-top: var(--report-space-sm); }
    .step-block img { width: 100%; max-width: 420px; height: auto; border: 1px solid var(--report-border); border-radius: var(--report-radius-sm); display: block; cursor: zoom-in; }
    .step-description-hr { margin: var(--report-space-lg) 0; border: 0; border-top: 1px solid var(--report-border); }
    .step-block .step-description-text { margin: 0; font-size: var(--report-font-xs); white-space: pre-wrap; }
    .nav-wrapper { position: fixed; bottom: var(--report-space-lg); right: var(--report-space-lg); display: flex; flex-direction: column; align-items: flex-end; gap: var(--report-space-sm); z-index: 10; }
    .nav-end-message { font-size: var(--report-font-sm); color: var(--report-muted); display: none; }
    .nav-end-message.visible { display: block; }
    .nav-buttons { display: flex; flex-direction: column; gap: var(--report-space-sm); }
    .nav-buttons button { padding: var(--report-space-sm) var(--report-space-md); font-size: var(--report-font-sm); cursor: pointer; border: 1px solid var(--report-border); border-radius: var(--report-radius-md); background: var(--report-surface); color: var(--report-text); min-height: 2.25rem; min-width: 82px; box-sizing: border-box; }
    .nav-buttons button:hover { background: var(--report-surface-hover); }
    .nav-row { display: flex; gap: var(--report-space-sm); }
    .nav-row-prev { margin-bottom: var(--report-space-md); }
    .test-index-indicator { position: fixed; top: var(--report-space-md); right: var(--report-space-md); z-index: 10; font-size: var(--report-font-sm); padding: var(--report-space-sm) var(--report-space-md); background: var(--report-surface); color: var(--report-text); border: 1px solid var(--report-border); border-radius: var(--report-radius-md); }
    .hub-grid { display: grid; gap: var(--report-space-md); max-width: 720px; }
    .hub-card { border: 1px solid var(--report-border); border-radius: var(--report-radius-md); padding: var(--report-space-lg); background: var(--report-surface); }
    .hub-card.missing { opacity: 0.55; }
    .meta { color: var(--report-muted); font-size: var(--report-font-sm); margin-bottom: var(--report-space-lg); }
  `;
}

function navScript() {
  return `
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
        if (prevShot !== null) { hideEndMessage(); scrollToShot(prevShot); return; }
        var prevTest = findPrevByTopNoWrap(testSections, 0);
        if (prevTest !== null) { hideEndMessage(); scrollTo(prevTest); return; }
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
        if (nextShot !== null) { hideEndMessage(); scrollToShot(nextShot); return; }
        var nextTest = findNextByTopNoWrap(testSections, 0);
        if (nextTest !== null) { hideEndMessage(); scrollTo(nextTest); return; }
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
  `;
}

function buildSlotHtml(slot, flows) {
  const passed = flows.filter((f) => f.status === 'passed').length;
  const failed = flows.filter((f) => f.status === 'failed').length;
  const timedOut = flows.filter((f) => f.status === 'timedOut').length;
  const skipped = flows.filter((f) => f.status === 'skipped').length;
  const total = flows.length;

  const parts = [];
  parts.push(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile E2E – ${escapeHtml(slot.label)}</title>
  <style>${reportSharedCss()}</style>
</head>
<body>
  <div id="test-index-indicator" class="test-index-indicator" aria-live="polite" role="status">— / —</div>
  <h1>Mobile E2E – ${escapeHtml(slot.label)}</h1>
  <p class="meta">Slot <code>${escapeHtml(slot.id)}</code> · hub: <a href="../index.html">../index.html</a> · Maestro raw: <a href="./maestro.html">maestro.html</a></p>
  <h2 class="section-heading">Test summary</h2>
  <div class="summary">
    <div class="summary-stats">${total} flow${total === 1 ? '' : 's'}: ${passed} passed${skipped > 0 ? `, ${skipped} skipped` : ''}, ${failed} failed${timedOut > 0 ? `, ${timedOut} timed out` : ''}</div>
    <ul class="summary-list">
`);

  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    const prefixClass =
      flow.status === 'passed'
        ? 'prefix-pass'
        : flow.status === 'skipped'
          ? 'prefix-skip'
          : flow.status === 'timedOut'
            ? 'prefix-timeout'
            : 'prefix-error';
    parts.push(
      `      <li><span class="${prefixClass}">${escapeHtml(statusDisplayLabel(flow.status))}:</span> ${i + 1}) <a href="#test-${i}">${escapeHtml(flow.title)}</a></li>\n`
    );
  }
  parts.push(`    </ul>
  </div>
  <h2 class="section-heading">Screenshots and steps</h2>
`);

  let shotIndex = 0;
  for (let i = 0; i < flows.length; i++) {
    const flow = flows[i];
    parts.push(`  <section id="test-${i}" class="test" data-test-index="${i}" data-status="${escapeHtml(flow.status)}">
    <h2>${escapeHtml(flow.title)}</h2>
    <div class="status ${escapeHtml(flow.status === 'timedOut' ? 'timedout' : flow.status)}">${escapeHtml(statusDisplayLabel(flow.status))}</div>
`);
    if (flow.errorMessage !== '') {
      parts.push(`    <div class="error">${escapeHtml(flow.errorMessage)}</div>\n`);
    }
    if (flow.steps.length > 0) {
      parts.push(`    <ol class="step-list">\n`);
      for (const step of flow.steps) {
        const cls = step.status === 'failed' || step.status === 'timedOut' ? ' step-failed' : '';
        parts.push(
          `      <li class="${cls.trim()}">${escapeHtml(step.label)} (${escapeHtml(step.status)})</li>\n`
        );
      }
      parts.push(`    </ol>\n`);
    }
    for (const img of flow.images) {
      parts.push(`    <hr class="step-description-hr">
    <div class="step-block" data-shot-index="${shotIndex}">
      <div class="step-description-text">${escapeHtml(img.base)}</div>
      <a class="step-image-link" href="${escapeHtml(img.rel)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(img.rel)}" alt="${escapeHtml(img.base)}">
      </a>
    </div>
`);
      shotIndex += 1;
    }
    if (flow.images.length === 0) {
      parts.push(`    <p class="meta">No screenshots captured for this flow.</p>\n`);
    }
    parts.push(`  </section>\n`);
  }

  if (flows.length === 0) {
    parts.push(`  <p class="meta">No Maestro command logs found in this slot yet.</p>\n`);
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
  <script>${navScript()}</script>
</body>
</html>
`);
  return parts.join('');
}

function buildHubHtml(slotStatuses) {
  const cards = SLOT_META.map((slot) => {
    const st = slotStatuses.get(slot.id);
    if (!st) {
      return `    <div class="hub-card missing">
      <h2>${escapeHtml(slot.label)}</h2>
      <p>Not run this pass (<code>${escapeHtml(slot.id)}</code>). Reserved for future tablet/phone matrix coverage.</p>
    </div>`;
    }
    const prefix =
      st.failed > 0 || st.timedOut > 0
        ? 'prefix-error'
        : st.total === 0
          ? 'prefix-skip'
          : 'prefix-pass';
    return `    <div class="hub-card">
      <h2><a href="${escapeHtml(st.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(slot.label)}</a></h2>
      <p class="${prefix}">${st.passed} passed, ${st.failed} failed${st.timedOut > 0 ? `, ${st.timedOut} timed out` : ''} (${st.total} flow${st.total === 1 ? '' : 's'})</p>
      <p class="meta"><code>${escapeHtml(slot.id)}</code></p>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile E2E report hub</title>
  <style>${reportSharedCss()}</style>
</head>
<body>
  <h1>Mobile E2E report hub</h1>
  <p class="meta">One HTML report per <strong>OS + device form factor</strong>. Slot links open in a <strong>new tab</strong>. Open a card for screenshots, step lists, and Prev/Next Error navigation (same chrome as web E2E).</p>
  <div class="hub-grid">
${cards}
  </div>
</body>
</html>
`;
}

function resolveSlotDirs(root) {
  /** @type {Map<string, { abs: string, rel: string }>} */
  const map = new Map();
  for (const slot of SLOT_META) {
    const dir = path.join(root, slot.id);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      map.set(slot.id, { abs: dir, rel: slot.id });
    }
  }
  for (const [legacy, slotId] of Object.entries(LEGACY_DIR_TO_SLOT)) {
    if (map.has(slotId)) {
      continue;
    }
    const dir = path.join(root, legacy);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      map.set(slotId, { abs: dir, rel: legacy });
    }
  }
  return map;
}

const slotDirs = resolveSlotDirs(reportRoot);
/** @type {Map<string, { total: number, passed: number, failed: number, timedOut: number, href: string }>} */
const slotStatuses = new Map();

for (const slot of SLOT_META) {
  const resolved = slotDirs.get(slot.id);
  if (!resolved) {
    continue;
  }
  const dir = resolved.abs;

  // If Maestro wrote index.html in the slot, preserve it as maestro.html once.
  const maestroOut = path.join(dir, 'index.html');
  const maestroRaw = path.join(dir, 'maestro.html');
  if (fs.existsSync(maestroOut) && !fs.existsSync(maestroRaw)) {
    fs.renameSync(maestroOut, maestroRaw);
  }

  const flows = loadFlowsFromSlot(dir);
  const html = buildSlotHtml(slot, flows);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

  slotStatuses.set(slot.id, {
    total: flows.length,
    passed: flows.filter((f) => f.status === 'passed').length,
    failed: flows.filter((f) => f.status === 'failed').length,
    timedOut: flows.filter((f) => f.status === 'timedOut').length,
    href: `${resolved.rel}/index.html`,
  });
  console.log(`Wrote ${path.join(dir, 'index.html')} (${flows.length} flow(s) for ${slot.id})`);
}

fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(path.join(reportRoot, 'index.html'), buildHubHtml(slotStatuses), 'utf8');
console.log(`Wrote hub ${path.join(reportRoot, 'index.html')}`);
console.log(`Slots present: ${[...slotStatuses.keys()].join(', ') || '(none)'}`);
