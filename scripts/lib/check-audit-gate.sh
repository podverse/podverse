#!/usr/bin/env bash
# Shared npm audit gate with allowlist support
# Centralizes audit validation logic across release scripts to maintain consistency
# Usage: scripts/lib/check-audit-gate.sh <allowed-ids> [context-name]
# Example: scripts/lib/check-audit-gate.sh "" "promote to alpha"
# Example with allowlist: scripts/lib/check-audit-gate.sh "1113977" "promote to alpha"
#
# If no allowed-ids provided or empty string, no advisories are allowlisted (strict mode).
# Exit code 0 = audit passed, 1 = audit failed
#
# Mobile isolation: findings whose installed nodes are exclusively under Expo / React Native
# tooling are skipped. Server publish (staging/main) must not be blocked by mobile-only deps;
# mobile has its own release track. See docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md

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

/** Path segments that identify Expo / RN mobile tooling (not server publish surface). */
const MOBILE_ONLY_NODE_PATTERN =
  /(^|\/)(apps\/mobile|node_modules\/(@expo\/|@react-native\/|expo(-|$)|react-native(-|$)|metro(-|$)))/;

/**
 * True when every installed node for this vulnerability lives under mobile tooling.
 * Mixed trees (mobile + server) are NOT skipped — those still fail the server gate.
 */
function isMobileOnlyVulnerability(pkg) {
  const nodes = Array.isArray(pkg.nodes) ? pkg.nodes : [];
  if (nodes.length === 0) {
    return false;
  }
  return nodes.every((nodePath) => MOBILE_ONLY_NODE_PATTERN.test(String(nodePath)));
}

const jsonText = readFileSync(reportPath, 'utf8');
const audit = JSON.parse(jsonText);
const vulnerabilities = audit.vulnerabilities ?? {};
const failures = [];
let skippedMobileOnly = 0;

for (const [pkgName, pkg] of Object.entries(vulnerabilities)) {
  if (isMobileOnlyVulnerability(pkg)) {
    skippedMobileOnly += 1;
    continue;
  }

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

const mobileNote =
  skippedMobileOnly > 0
    ? `; skipped ${skippedMobileOnly} mobile-only package tree(s)`
    : '';
console.log(
  `Audit gate passed. Allowed advisory IDs: ${allowedRaw || '(none)'}${mobileNote}`
);
NODE
then
  rm -f "$AUDIT_REPORT_FILE_PATH"
  exit 1
fi

rm -f "$AUDIT_REPORT_FILE_PATH"
