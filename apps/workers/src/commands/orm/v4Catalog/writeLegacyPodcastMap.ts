import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import { queryV4, queryV5 } from './seedCatalogApply.js';
import type { LegacyPodcastMapRow, V4PodcastMapSource } from './writeLegacyPodcastMapLib.js';
import { planLegacyPodcastMapRow } from './writeLegacyPodcastMapLib.js';

export const V4_WRITE_LEGACY_PODCAST_MAP_HELP = `v4WriteLegacyPodcastMap

Read every v4 podcast and write one legacy_id_map podcast row. Spam and
takedown rows are dropped. A podcast with no http(s) authority feed URL is
skipped. The command reads V4_DATABASE_URL in a read-only transaction and
writes legacy_id_map. A row already mapped keeps that status. v5_id_text is
left as stored.

Flags:
  -dryRun              Count only. Do not write. --dry-run is the same flag
  -maxPages N          Stop after N pages of 2000
  -startAfterIntId N   Resume after this v4 int_id
  -help                Show this text

The log is counts only.
`;

const PAGE_SIZE = 2000;

const PODCAST_PAGE_SQL = `
SELECT DISTINCT ON (p.int_id)
       p.int_id,
       p.id,
       p."podcastIndexId" AS podcast_index_id,
       NULLIF(btrim(f.url), '') AS authority_url,
       (p."isPublic" IS TRUE) AS is_public,
       p.flag_status::text AS flag_status
FROM podcasts p
LEFT JOIN "feedUrls" f ON f."podcastId" = p.id AND f."isAuthority" IS TRUE
WHERE p.int_id > $1
ORDER BY p.int_id, f.url
LIMIT ${PAGE_SIZE}
`;

type PageCounts = {
  rowsRead: number;
  rowsSkipped: number;
  unresolved: number;
  dropped: number;
};

type RunCounts = PageCounts & {
  pages: number;
};

type RunOptions = {
  dryRun: boolean;
  maxPages: number;
  startAfterIntId: number;
};

type PlannedPage = {
  lastIntId: number;
  planned: LegacyPodcastMapRow[];
  counts: PageCounts;
};

function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function isDryRun(args: CommandLineArgs): boolean {
  return hasOption(args, 'dryRun') || hasOption(args, 'dry-run') || hasOption(args, 'dry_run');
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const code: unknown = Reflect.get(error, 'code');
  if (typeof code !== 'string' || !/^[A-Za-z0-9]{5,15}$/.test(code)) {
    return null;
  }
  return code;
}

function failDatabase(message: string, error: unknown): never {
  const code = errorCode(error);
  const suffix = code === null ? '.' : ` (${code}).`;
  throw new Error(`${message}${suffix}`);
}

function readOptionalInt(args: CommandLineArgs, key: string): number | undefined {
  if (!hasOption(args, key)) {
    return undefined;
  }
  const raw = args[key];
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) {
    throw new Error(`Invalid -${key}.`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid -${key}.`);
  }
  return parsed;
}

function readOptions(args: CommandLineArgs): RunOptions {
  const maxPages = readOptionalInt(args, 'maxPages');
  if (maxPages === 0) {
    throw new Error('Invalid -maxPages.');
  }
  return {
    dryRun: isDryRun(args),
    maxPages: maxPages ?? Number.POSITIVE_INFINITY,
    startAfterIntId: readOptionalInt(args, 'startAfterIntId') ?? 0,
  };
}

function intIdOf(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }
  throw new Error('Could not read the v4 catalog.');
}

function isPublicOf(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  throw new Error('Could not read the v4 catalog.');
}

function optionalText(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('Could not read the v4 catalog.');
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function requiredText(value: unknown): string {
  const text = optionalText(value);
  if (text === null) {
    throw new Error('Could not read the v4 catalog.');
  }
  return text;
}

function podcastIndexOf(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return optionalText(value);
}

function sourceFromRow(row: Record<string, unknown>): V4PodcastMapSource {
  return {
    id: requiredText(row.id),
    podcastIndexId: podcastIndexOf(row.podcast_index_id),
    authorityUrl: optionalText(row.authority_url),
    isPublic: isPublicOf(row.is_public),
    flagStatus: optionalText(row.flag_status),
  };
}

function planPage(rows: readonly Record<string, unknown>[], afterIntId: number): PlannedPage {
  let lastIntId = afterIntId;
  const planned: LegacyPodcastMapRow[] = [];
  const seen = new Set<string>();
  let rowsSkipped = 0;
  let unresolved = 0;
  let dropped = 0;

  for (const row of rows) {
    const intId = intIdOf(row.int_id);
    if (intId <= lastIntId) {
      throw new Error('Could not read the v4 catalog.');
    }
    lastIntId = intId;

    const plannedRow = planLegacyPodcastMapRow(sourceFromRow(row));
    if (plannedRow === null) {
      rowsSkipped += 1;
      continue;
    }
    if (plannedRow.legacyId === '' || seen.has(plannedRow.legacyId)) {
      throw new Error('Could not read the v4 catalog.');
    }
    seen.add(plannedRow.legacyId);
    planned.push(plannedRow);
    if (plannedRow.status === 'dropped') {
      dropped += 1;
    } else {
      unresolved += 1;
    }
  }

  return {
    lastIntId,
    planned,
    counts: {
      rowsRead: rows.length,
      rowsSkipped,
      unresolved,
      dropped,
    },
  };
}

function insertSql(rowCount: number): string {
  const tuples: string[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const offset = row * 4;
    tuples.push(
      `('podcast', $${offset + 1}, 'channel', $${offset + 2}, $${offset + 3}, $${offset + 4})`
    );
  }
  return `INSERT INTO legacy_id_map (
  legacy_kind, legacy_id, v5_kind, status, resolve_key, v4_feed_url
)
VALUES
${tuples.join(',\n')}
ON CONFLICT (legacy_kind, legacy_id) DO UPDATE SET
  resolve_key = EXCLUDED.resolve_key,
  v4_feed_url = EXCLUDED.v4_feed_url,
  status = CASE WHEN legacy_id_map.status = 'mapped' THEN 'mapped' ELSE EXCLUDED.status END`;
}

function insertValues(rows: readonly LegacyPodcastMapRow[]): (string | null)[] {
  const values: (string | null)[] = [];
  for (const row of rows) {
    values.push(row.legacyId, row.status, row.resolveKey, row.v4FeedUrl);
  }
  return values;
}

function emptyCounts(): RunCounts {
  return {
    pages: 0,
    rowsRead: 0,
    rowsSkipped: 0,
    unresolved: 0,
    dropped: 0,
  };
}

function addCounts(totals: RunCounts, counts: PageCounts): void {
  totals.rowsRead += counts.rowsRead;
  totals.rowsSkipped += counts.rowsSkipped;
  totals.unresolved += counts.unresolved;
  totals.dropped += counts.dropped;
}

function countFields(counts: PageCounts): {
  rowsRead: number;
  rowsSkipped: number;
  rowsWritten: { unresolved: number; dropped: number };
} {
  return {
    rowsRead: counts.rowsRead,
    rowsSkipped: counts.rowsSkipped,
    rowsWritten: {
      unresolved: counts.unresolved,
      dropped: counts.dropped,
    },
  };
}

function logPage(dryRun: boolean, page: number, counts: PageCounts): void {
  getLogger().info(dryRun ? 'v4 legacy podcast map dry run page' : 'v4 legacy podcast map page', {
    dryRun,
    page,
    ...countFields(counts),
  });
}

function logFinished(dryRun: boolean, counts: RunCounts): void {
  getLogger().info(
    dryRun ? 'v4 legacy podcast map dry run finished' : 'v4 legacy podcast map finished',
    {
      dryRun,
      pages: counts.pages,
      ...countFields(counts),
    }
  );
}

async function readPodcastPage(
  client: Client,
  afterIntId: number
): Promise<Record<string, unknown>[]> {
  try {
    await client.query('BEGIN READ ONLY');
  } catch (error) {
    failDatabase('Could not read the v4 catalog', error);
  }
  try {
    const rows = await queryV4(client, PODCAST_PAGE_SQL, [afterIntId]);
    await client.query('COMMIT');
    return rows;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    failDatabase('Could not read the v4 catalog', error);
  }
}

async function writePodcastPage(rows: readonly LegacyPodcastMapRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  try {
    await queryV5(insertSql(rows.length), insertValues(rows));
  } catch (error) {
    failDatabase('Could not write the legacy podcast map', error);
  }
}

async function mapPages(client: Client, options: RunOptions): Promise<RunCounts> {
  const totals = emptyCounts();
  let afterIntId = options.startAfterIntId;
  for (;;) {
    if (totals.pages >= options.maxPages) {
      break;
    }
    const rows = await readPodcastPage(client, afterIntId);
    if (rows.length === 0) {
      break;
    }
    const page = planPage(rows, afterIntId);
    if (!options.dryRun) {
      await writePodcastPage(page.planned);
    }
    totals.pages += 1;
    addCounts(totals, page.counts);
    logPage(options.dryRun, totals.pages, page.counts);
    afterIntId = page.lastIntId;
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return totals;
}

/**
 * Writes one legacy_id_map podcast row per v4 podcast page.
 * The v4 connection is read-only. The log is counts. No podcast id, feed URL,
 * or connection string is logged.
 */
export const v4WriteLegacyPodcastMap = async (args: CommandLineArgs): Promise<void> => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_WRITE_LEGACY_PODCAST_MAP_HELP);
    return;
  }

  const options = readOptions(args);
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }

  const client = new Client({ connectionString });
  try {
    try {
      await client.connect();
      await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    } catch (error) {
      failDatabase('Could not read the v4 catalog', error);
    }
    const counts = await mapPages(client, options);
    logFinished(options.dryRun, counts);
  } finally {
    await client.end().catch(() => undefined);
  }
};
