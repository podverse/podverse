export const LEGACY_MEMBERSHIP_IMPORT_REPORT_HEADER = 'line,email,reason,membership_expires_at';

export type LegacyMembershipImportReportReason =
  'unmatched' | 'ambiguous' | 'skipped_expired' | 'invalid';

export type LegacyMembershipImportReportRow = {
  line: number;
  email: string;
  reason: LegacyMembershipImportReportReason;
  membershipExpiresAt: string;
};

export type LegacyMembershipImportCounts = {
  rows: number;
  created: number;
  updated: number;
  unchanged: number;
  skippedExpired: number;
  unmatched: number;
  ambiguous: number;
  invalid: number;
};

export type LegacyMembershipImportResult = {
  counts: LegacyMembershipImportCounts;
  reportRows: LegacyMembershipImportReportRow[];
};

export type LegacyMembershipAccountMatch =
  { status: 'matched'; accountId: number } | { status: 'unmatched' } | { status: 'ambiguous' };

export type LegacyImportGrant = {
  id: number;
  endsAt: Date;
};

export type LegacyImportGrantChoice = LegacyImportGrant & {
  revokedAt: Date | null;
};

export type LegacyMembershipExpiryImportDeps = {
  now: Date;
  dryRun: boolean;
  matchAccount: (normalizedEmail: string) => Promise<LegacyMembershipAccountMatch>;
  findLegacyImport: (accountId: number) => Promise<LegacyImportGrant | null>;
  createLegacyImport: (params: {
    accountId: number;
    source: 'legacy_import';
    startsAt: Date;
    endsAt: Date;
  }) => Promise<{ id: number }>;
  raiseLegacyImportEnd: (params: {
    grantId: number;
    accountId: number;
    endsAt: Date;
  }) => Promise<void>;
};

type ParsedLegacyMembershipRow =
  | {
      kind: 'expiry';
      line: number;
      email: string;
      expiresAt: Date | null;
      rawExpiresAt: string;
    }
  | {
      kind: 'invalid';
      line: number;
      email: string;
      rawExpiresAt: string;
    };

type SeenLegacyImport = { state: 'none' } | { state: 'grant'; id: number; endsAt: Date };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function emptyCounts(): LegacyMembershipImportCounts {
  return {
    rows: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedExpired: 0,
    unmatched: 0,
    ambiguous: 0,
    invalid: 0,
  };
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatLegacyMembershipImportReport(
  rows: readonly LegacyMembershipImportReportRow[]
): string {
  const lines = [LEGACY_MEMBERSHIP_IMPORT_REPORT_HEADER];
  for (const row of rows) {
    lines.push(
      [String(row.line), csvField(row.email), row.reason, csvField(row.membershipExpiresAt)].join(
        ','
      )
    );
  }
  return `${lines.join('\n')}\n`;
}

/** Trimmed lowercase email with a single @, or null when the cell cannot be matched. */
export function normalizeLegacyMembershipEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@') || at === email.length - 1) {
    return null;
  }
  return email;
}

function parseUtcDateOnly(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * ISO-8601 UTC, or a calendar date read as UTC midnight. Anything else is invalid so a
 * timestamp without a zone cannot shift the expiry by a local offset.
 */
export function parseLegacyMembershipExpiresAt(raw: string): Date | null | 'invalid' {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly !== null) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = parseUtcDateOnly(year, month, day);
    return date === null ? 'invalid' : date;
  }

  if (DATE_TIME.exec(trimmed) === null) {
    return 'invalid';
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'invalid';
  }
  return parsed;
}

function invalidRow(line: number, email: string, rawExpiresAt: string): ParsedLegacyMembershipRow {
  return { kind: 'invalid', line, email, rawExpiresAt };
}

function expiryRow(line: number, email: string, rawExpiresAt: string): ParsedLegacyMembershipRow {
  const expiresAt = parseLegacyMembershipExpiresAt(rawExpiresAt);
  if (expiresAt === 'invalid') {
    return invalidRow(line, email, rawExpiresAt.trim());
  }
  return {
    kind: 'expiry',
    line,
    email,
    expiresAt,
    rawExpiresAt: rawExpiresAt.trim(),
  };
}

function classifyCells(
  line: number,
  emailRaw: string,
  expiresRaw: string
): ParsedLegacyMembershipRow {
  const email = normalizeLegacyMembershipEmail(emailRaw);
  if (email === null) {
    return invalidRow(line, emailRaw.trim(), expiresRaw.trim());
  }
  return expiryRow(line, email, expiresRaw);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char ?? '';
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char ?? '';
    }
  }

  fields.push(current);
  return fields;
}

function firstContentLine(lines: readonly string[]): string {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed !== '') {
      return trimmed;
    }
  }
  return '';
}

function parseCsv(lines: readonly string[]): ParsedLegacyMembershipRow[] {
  let headerIndex = -1;
  let header: string[] | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.trim() === '') {
      continue;
    }
    headerIndex = index;
    header = parseCsvLine(line).map((field) => field.trim().toLowerCase());
    break;
  }

  if (header === null) {
    throw new Error('Legacy membership file is empty.');
  }

  const emailIndex = header.indexOf('email');
  const expiresIndex = header.indexOf('membership_expires_at');
  if (emailIndex === -1 || expiresIndex === -1) {
    throw new Error('Legacy membership CSV header must include email and membership_expires_at.');
  }

  const rows: ParsedLegacyMembershipRow[] = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.trim() === '') {
      continue;
    }
    const fields = parseCsvLine(line);
    rows.push(classifyCells(index + 1, fields[emailIndex] ?? '', fields[expiresIndex] ?? ''));
  }
  return rows;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonLine(line: string, lineNumber: number): ParsedLegacyMembershipRow {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return invalidRow(lineNumber, '', line.trim());
  }

  if (!isJsonObject(value)) {
    return invalidRow(lineNumber, '', line.trim());
  }
  if (typeof value.email !== 'string') {
    return invalidRow(lineNumber, '', '');
  }

  const expiresField = value.membership_expires_at;
  if (expiresField === null) {
    return classifyCells(lineNumber, value.email, '');
  }
  if (typeof expiresField !== 'string') {
    return invalidRow(lineNumber, value.email.trim(), '');
  }
  return classifyCells(lineNumber, value.email, expiresField);
}

function parseJsonLines(lines: readonly string[]): ParsedLegacyMembershipRow[] {
  const rows: ParsedLegacyMembershipRow[] = [];
  let sawContent = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.trim() === '') {
      continue;
    }
    sawContent = true;
    rows.push(parseJsonLine(line, index + 1));
  }

  if (!sawContent) {
    throw new Error('Legacy membership file is empty.');
  }
  return rows;
}

/**
 * The grant a later file row should extend. An open grant wins over a revoked one. When every
 * legacy_import grant is revoked, the latest revoked grant is returned so a re-import updates
 * that row and does not add a second grant.
 */
export function selectLegacyImportGrant(
  grants: readonly LegacyImportGrantChoice[]
): LegacyImportGrant | null {
  const open = grants.filter((grant) => grant.revokedAt === null);
  const pool = open.length > 0 ? open : grants;
  let latest: LegacyImportGrantChoice | null = null;
  for (const grant of pool) {
    if (latest === null || grant.endsAt.getTime() > latest.endsAt.getTime()) {
      latest = grant;
    }
  }
  if (latest === null) {
    return null;
  }
  return { id: latest.id, endsAt: latest.endsAt };
}

export function parseLegacyMembershipExpiryDocument(text: string): ParsedLegacyMembershipRow[] {
  const lines = stripBom(text).split(/\r?\n/);
  const firstLine = firstContentLine(lines);
  if (firstLine.startsWith('{')) {
    return parseJsonLines(lines);
  }
  return parseCsv(lines);
}

function reportRow(
  line: number,
  email: string,
  reason: LegacyMembershipImportReportReason,
  membershipExpiresAt: string
): LegacyMembershipImportReportRow {
  return { line, email, reason, membershipExpiresAt };
}

/**
 * Imports one file of email + expiry rows. An open `legacy_import` grant keeps the later
 * `ends_at`. Dry-run still resolves accounts and fills the report, and does not call the
 * write dependencies. Rows for the same account in one file see earlier rows in that file.
 */
export async function importLegacyMembershipExpiryFromText(
  text: string,
  deps: LegacyMembershipExpiryImportDeps
): Promise<LegacyMembershipImportResult> {
  const parsed = parseLegacyMembershipExpiryDocument(text);
  const counts = emptyCounts();
  const reportRows: LegacyMembershipImportReportRow[] = [];
  const seen = new Map<number, SeenLegacyImport>();

  const loadSeen = async (accountId: number): Promise<SeenLegacyImport> => {
    const cached = seen.get(accountId);
    if (cached !== undefined) {
      return cached;
    }
    const existing = await deps.findLegacyImport(accountId);
    const loaded: SeenLegacyImport =
      existing === null
        ? { state: 'none' }
        : { state: 'grant', id: existing.id, endsAt: existing.endsAt };
    seen.set(accountId, loaded);
    return loaded;
  };

  for (const row of parsed) {
    counts.rows += 1;

    if (row.kind === 'invalid') {
      counts.invalid += 1;
      reportRows.push(reportRow(row.line, row.email, 'invalid', row.rawExpiresAt));
      continue;
    }

    if (row.expiresAt === null || row.expiresAt.getTime() <= deps.now.getTime()) {
      counts.skippedExpired += 1;
      reportRows.push(reportRow(row.line, row.email, 'skipped_expired', row.rawExpiresAt));
      continue;
    }

    const match = await deps.matchAccount(row.email);
    if (match.status === 'unmatched') {
      counts.unmatched += 1;
      reportRows.push(reportRow(row.line, row.email, 'unmatched', row.rawExpiresAt));
      continue;
    }
    if (match.status === 'ambiguous') {
      counts.ambiguous += 1;
      reportRows.push(reportRow(row.line, row.email, 'ambiguous', row.rawExpiresAt));
      continue;
    }

    const current = await loadSeen(match.accountId);
    if (current.state === 'none') {
      if (deps.dryRun) {
        seen.set(match.accountId, { state: 'grant', id: 0, endsAt: row.expiresAt });
      } else {
        const created = await deps.createLegacyImport({
          accountId: match.accountId,
          source: 'legacy_import',
          startsAt: deps.now,
          endsAt: row.expiresAt,
        });
        seen.set(match.accountId, {
          state: 'grant',
          id: created.id,
          endsAt: row.expiresAt,
        });
      }
      counts.created += 1;
      continue;
    }

    if (row.expiresAt.getTime() > current.endsAt.getTime()) {
      if (!deps.dryRun) {
        await deps.raiseLegacyImportEnd({
          grantId: current.id,
          accountId: match.accountId,
          endsAt: row.expiresAt,
        });
      }
      current.endsAt = row.expiresAt;
      counts.updated += 1;
      continue;
    }

    counts.unchanged += 1;
  }

  return { counts, reportRows };
}
