import {
  normalizeLegacyMembershipEmail,
  parseLegacyMembershipExpiresAt,
} from './importLegacyMembershipExpiryLib.js';

/**
 * users.membershipExpiration is timestamp without time zone and stores UTC.
 * The text form keeps that clock. A driver Date would follow the session time zone.
 * purchase_date_ms is compared as numeric so a long digit string does not abort the read.
 */
export const PAID_EXPIRY_SOURCE_SQL = `
SELECT ids.id AS id_text,
       u.email,
       CASE
         WHEN u."membershipExpiration" IS NULL THEN NULL
         ELSE to_char(u."membershipExpiration", 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
       END AS membership_expires_at,
       (u.id IS NOT NULL) AS found,
       COALESCE(
         u."membershipExpiration" > ($2::timestamptz AT TIME ZONE 'UTC'),
         false
       ) AS beyond_five_years,
       EXISTS (
         SELECT 1
         FROM "appStorePurchase" p
         WHERE p."ownerId" = u.id
           AND p.purchase_date_ms ~ '^[0-9]+$'
           AND p.purchase_date_ms::numeric >= 1703635200000
           AND p.purchase_date_ms::numeric < 1706745600000
       ) AS app_store_window
FROM unnest($1::varchar[]) AS ids(id)
LEFT JOIN users u ON u.id = ids.id
`;

export type PaidExpiryQueryRow = {
  id_text: string;
  email: string | null;
  membership_expires_at: string | null;
  found: boolean;
  beyond_five_years: boolean;
  app_store_window: boolean;
};

export type RebuildLegacyMembershipExpiryFileResult = {
  rowsWritten: number;
  capped: number;
  futureUncapped: number;
  past: number;
  noGrant: number;
  skippedInvalidEmail: number;
  invalidExpiry: number;
  missingIds: string[];
  ambiguousIds: string[];
  invalidEmailIds: string[];
  invalidExpiryIds: string[];
  futureIds: string[];
  pastIds: string[];
  cappedIds: string[];
};

export type PaidExpiryCsvBuild = RebuildLegacyMembershipExpiryFileResult & {
  csv: string;
};

const PAID_EXPIRY_CSV_HEADER = 'email,membership_expires_at';

type ExpiryCandidate = {
  id: string;
  email: string;
  expiresAt: Date;
  rawExpiresAt: string;
  beyondFiveYears: boolean;
  appStoreWindow: boolean;
};

export function addUtcYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

function assertValidRebuildNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Membership expiry rebuild needs a valid time.');
  }
}

function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function emptyRebuildResult(): RebuildLegacyMembershipExpiryFileResult {
  return {
    rowsWritten: 0,
    capped: 0,
    futureUncapped: 0,
    past: 0,
    noGrant: 0,
    skippedInvalidEmail: 0,
    invalidExpiry: 0,
    missingIds: [],
    ambiguousIds: [],
    invalidEmailIds: [],
    invalidExpiryIds: [],
    futureIds: [],
    pastIds: [],
    cappedIds: [],
  };
}

function classifyRequestedId(
  id: string,
  row: PaidExpiryQueryRow | undefined,
  result: RebuildLegacyMembershipExpiryFileResult,
  candidates: ExpiryCandidate[]
): void {
  if (row === undefined || row.found !== true) {
    result.missingIds.push(id);
    return;
  }

  const rawExpiresAt = row.membership_expires_at;
  if (rawExpiresAt === null || rawExpiresAt.trim() === '') {
    result.noGrant += 1;
    return;
  }

  const email = normalizeLegacyMembershipEmail(row.email ?? '');
  if (email === null) {
    result.skippedInvalidEmail += 1;
    result.invalidEmailIds.push(id);
    return;
  }

  const expiresAt = parseLegacyMembershipExpiresAt(rawExpiresAt);
  if (expiresAt === null || expiresAt === 'invalid') {
    result.invalidExpiry += 1;
    result.invalidExpiryIds.push(id);
    return;
  }

  candidates.push({
    id,
    email,
    expiresAt,
    rawExpiresAt,
    beyondFiveYears: row.beyond_five_years === true,
    appStoreWindow: row.app_store_window === true,
  });
}

function ambiguousIdSet(candidates: readonly ExpiryCandidate[]): Set<string> {
  const countByEmail = new Map<string, number>();
  for (const candidate of candidates) {
    countByEmail.set(candidate.email, (countByEmail.get(candidate.email) ?? 0) + 1);
  }

  const ambiguousIds = new Set<string>();
  for (const candidate of candidates) {
    if ((countByEmail.get(candidate.email) ?? 0) >= 2) {
      ambiguousIds.add(candidate.id);
    }
  }
  return ambiguousIds;
}

/**
 * Builds the email,membership_expires_at file for the requested ids.
 * An expiry at or before now is written as stored. A future App Store window
 * row beyond five years from now is rewritten to that shared end.
 */
export function buildPaidExpiryCsv(
  v4Ids: readonly string[],
  rows: readonly PaidExpiryQueryRow[],
  now: Date
): PaidExpiryCsvBuild {
  assertValidRebuildNow(now);

  const cap = addUtcYears(now, 5).toISOString();
  const rowById = new Map<string, PaidExpiryQueryRow>();
  for (const row of rows) {
    if (!rowById.has(row.id_text)) {
      rowById.set(row.id_text, row);
    }
  }

  const result = emptyRebuildResult();
  const candidates: ExpiryCandidate[] = [];
  for (const id of v4Ids) {
    classifyRequestedId(id, rowById.get(id), result, candidates);
  }

  const ambiguousIds = ambiguousIdSet(candidates);
  const written: Array<{ email: string; value: string }> = [];
  for (const candidate of candidates) {
    if (ambiguousIds.has(candidate.id)) {
      result.ambiguousIds.push(candidate.id);
      continue;
    }

    if (candidate.expiresAt.getTime() <= now.getTime()) {
      result.past += 1;
      result.pastIds.push(candidate.id);
      written.push({ email: candidate.email, value: candidate.rawExpiresAt });
      continue;
    }

    result.futureIds.push(candidate.id);
    if (candidate.beyondFiveYears && candidate.appStoreWindow) {
      result.capped += 1;
      result.cappedIds.push(candidate.id);
      written.push({ email: candidate.email, value: cap });
      continue;
    }

    result.futureUncapped += 1;
    written.push({ email: candidate.email, value: candidate.rawExpiresAt });
  }

  written.sort((left, right) => {
    if (left.email < right.email) {
      return -1;
    }
    if (left.email > right.email) {
      return 1;
    }
    return 0;
  });

  result.rowsWritten = result.futureIds.length + result.pastIds.length;
  const lines = [
    PAID_EXPIRY_CSV_HEADER,
    ...written.map((row) => `${csvField(row.email)},${csvField(row.value)}`),
  ];
  return { ...result, csv: `${lines.join('\n')}\n` };
}
