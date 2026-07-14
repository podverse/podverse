#!/usr/bin/env node
/**
 * Build a web/management-web E2E report hub (one page linking slot reports).
 * Usage: node scripts/e2e-html-hub-report.mjs <report-root-dir>
 *
 * Scans immediate child directories that contain index.html and writes
 * <report-root>/index.html with cards that open each report in a new tab.
 */

import fs from 'fs';
import path from 'path';

const reportRoot = process.argv[2];
if (!reportRoot) {
  console.error('Usage: node scripts/e2e-html-hub-report.mjs <report-root-dir>');
  process.exit(1);
}

/** Preferred display order + labels for known Playwright report slots. */
const KNOWN_SLOTS = [
  { id: 'web', label: 'Web' },
  { id: 'web-cloudflare-enabled', label: 'Web (Cloudflare enabled)' },
  { id: 'web-cookie-consent-enabled', label: 'Web (cookie consent)' },
  { id: 'web-signup-enabled', label: 'Web (signup enabled)' },
  { id: 'web-custom-themes-native', label: 'Web (custom themes native)' },
  { id: 'web-custom-themes-remote', label: 'Web (custom themes remote)' },
  { id: 'web-custom-themes-combo', label: 'Web (custom themes combo)' },
  { id: 'web-admin-only-email', label: 'Web (admin-only email)' },
  { id: 'management-web', label: 'Management-web' },
  { id: 'management-web-cloudflare-enabled', label: 'Management-web (Cloudflare enabled)' },
  { id: 'management-web-storage-enabled', label: 'Management-web (storage enabled)' },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function humanizeId(id) {
  return id
    .split('-')
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

function parseSummary(html) {
  const statsMatch = html.match(/class="summary-stats"[^>]*>([^<]+)</);
  const statsText = statsMatch !== null ? statsMatch[1].trim() : '';
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch !== null ? titleMatch[1].trim() : '';
  const failed = /\b(\d+)\s+failed\b/i.exec(statsText);
  const timedOut = /\b(\d+)\s+timed out\b/i.exec(statsText);
  const passed = /\b(\d+)\s+passed\b/i.exec(statsText);
  const total = /^(\d+)\s+test/i.exec(statsText);
  const failedCount =
    failed !== null ? Number(failed[1]) : html.includes('data-status="failed"') ? 1 : 0;
  const timedOutCount = timedOut !== null ? Number(timedOut[1]) : 0;
  const passedCount = passed !== null ? Number(passed[1]) : 0;
  const totalCount = total !== null ? Number(total[1]) : passedCount + failedCount + timedOutCount;
  return {
    statsText: statsText !== '' ? statsText : 'Report available',
    title,
    failed: failedCount,
    timedOut: timedOutCount,
    passed: passedCount,
    total: totalCount,
  };
}

function sharedCss() {
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
      --report-muted: #888;
      --report-space-sm: 0.5rem;
      --report-space-md: 0.75rem;
      --report-space-lg: 1rem;
      --report-space-xl: 1.5rem;
      --report-font-sm: 0.92rem;
      --report-font-title: 1.30rem;
      --report-radius-md: 6px;
    }
    body { font-family: system-ui, sans-serif; margin: var(--report-space-lg); background: var(--report-bg); color: var(--report-text); }
    h1 { font-size: var(--report-font-title); margin-bottom: var(--report-space-lg); }
    a { color: var(--report-link); }
    .meta { color: var(--report-muted); font-size: var(--report-font-sm); margin-bottom: var(--report-space-lg); }
    .hub-grid { display: grid; gap: var(--report-space-md); max-width: 720px; }
    .hub-card { border: 1px solid var(--report-border); border-radius: var(--report-radius-md); padding: var(--report-space-lg); background: var(--report-surface); }
    .hub-card.missing { opacity: 0.55; }
    .prefix-pass { color: var(--report-pass); }
    .prefix-error { color: var(--report-fail); }
    .prefix-timeout { color: var(--report-timeout); }
    .prefix-skip { color: var(--report-skip); }
  `;
}

if (!fs.existsSync(reportRoot) || !fs.statSync(reportRoot).isDirectory()) {
  console.error(`Report root not found: ${reportRoot}`);
  process.exit(1);
}

/** @type {Map<string, { href: string, label: string, statsText: string, failed: number, timedOut: number, total: number }>} */
const found = new Map();

for (const entry of fs.readdirSync(reportRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }
  const indexPath = path.join(reportRoot, entry.name, 'index.html');
  if (!fs.existsSync(indexPath)) {
    continue;
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const summary = parseSummary(html);
  const known = KNOWN_SLOTS.find((s) => s.id === entry.name);
  found.set(entry.name, {
    href: `${entry.name}/index.html`,
    label: known !== undefined ? known.label : summary.title || humanizeId(entry.name),
    statsText: summary.statsText,
    failed: summary.failed,
    timedOut: summary.timedOut,
    total: summary.total,
  });
}

const orderedIds = [
  ...KNOWN_SLOTS.map((s) => s.id).filter((id) => found.has(id)),
  ...[...found.keys()].filter((id) => !KNOWN_SLOTS.some((s) => s.id === id)).sort(),
];

const cards = orderedIds
  .map((id) => {
    const st = found.get(id);
    if (!st) {
      return '';
    }
    const prefix =
      st.failed > 0
        ? 'prefix-error'
        : st.timedOut > 0
          ? 'prefix-timeout'
          : st.total === 0
            ? 'prefix-skip'
            : 'prefix-pass';
    return `    <div class="hub-card">
      <h2><a href="${escapeHtml(st.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(st.label)}</a></h2>
      <p class="${prefix}">${escapeHtml(st.statsText)}</p>
      <p class="meta"><code>${escapeHtml(id)}</code></p>
    </div>`;
  })
  .filter((s) => s !== '')
  .join('\n');

const emptyNote =
  orderedIds.length === 0
    ? `    <div class="hub-card missing"><p>No slot reports found under this run yet.</p></div>`
    : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>E2E report hub</title>
  <style>${sharedCss()}</style>
</head>
<body>
  <h1>E2E report hub</h1>
  <p class="meta">One card per app / config slot from this run. Links open in a <strong>new tab</strong>. Same idea as the mobile E2E hub.</p>
  <div class="hub-grid">
${cards}
${emptyNote}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(reportRoot, 'index.html'), html, 'utf8');
console.log(`Wrote ${path.join(reportRoot, 'index.html')} (${orderedIds.length} slot(s))`);
