#!/bin/bash
# Shared npm audit gate with allowlist support
# Centralizes audit validation logic across release scripts to maintain consistency
# Usage: scripts/lib/check-audit-gate.sh <allowed-ids> [context-name]
# Example: scripts/lib/check-audit-gate.sh "1113977,1116970" "promote to alpha"
# 
# If no allowed-ids provided or empty string, no advisories are allowlisted (strict mode).
# Exit code 0 = audit passed, 1 = audit failed

set -e

ALLOWED_AUDIT_IDS="${1:-}"
CONTEXT="${2:-npm audit gate}"

AUDIT_REPORT_FILE_PATH="$(mktemp)"

# npm audit exits non-zero when vulnerabilities are present; we parse JSON ourselves below.
npm audit --omit=dev --json > "$AUDIT_REPORT_FILE_PATH" || true

if ! AUDIT_REPORT_FILE="$AUDIT_REPORT_FILE_PATH" ALLOWED_AUDIT_IDS="$ALLOWED_AUDIT_IDS" node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';

const reportPath = process.env.AUDIT_REPORT_FILE;
const allowedRaw = process.env.ALLOWED_AUDIT_IDS ?? '';

if (!reportPath) {
  console.error('Missing AUDIT_REPORT_FILE path.');
  process.exit(1);
}

const allowedIds = new Set(
  allowedRaw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
);

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const jsonText = readFileSync(reportPath, 'utf8');
const audit = JSON.parse(jsonText);
const vulnerabilities = audit.vulnerabilities ?? {};
const failures = [];

for (const [pkgName, pkg] of Object.entries(vulnerabilities)) {
  const via = Array.isArray(pkg.via) ? pkg.via : [];
  for (const advisory of via) {
    if (typeof advisory === 'string') {
      continue;
    }

    const severity = advisory.severity ?? 'low';
    if ((severityRank[severity] ?? 0) < severityRank.moderate) {
      continue;
    }

    const sourceId = advisory.source !== undefined ? String(advisory.source) : '';
    if (sourceId.length > 0 && allowedIds.has(sourceId)) {
      continue;
    }

    failures.push({
      package: pkgName,
      sourceId,
      severity,
      title: advisory.title ?? 'Untitled advisory',
      url: advisory.url ?? '',
    });
  }
}

if (failures.length > 0) {
  console.error('Disallowed moderate+ advisories detected:');
  for (const advisory of failures) {
    const idSuffix = advisory.sourceId ? ` (${advisory.sourceId})` : '';
    const urlSuffix = advisory.url ? ` - ${advisory.url}` : '';
    console.error(
      `- ${advisory.severity.toUpperCase()} ${advisory.package}${idSuffix}: ${advisory.title}${urlSuffix}`
    );
  }
  process.exit(1);
}

console.log(`Audit gate passed. Allowed advisory IDs: ${allowedRaw || '(none)'}`);
NODE
then
  rm -f "$AUDIT_REPORT_FILE_PATH"
  exit 1
fi

rm -f "$AUDIT_REPORT_FILE_PATH"
