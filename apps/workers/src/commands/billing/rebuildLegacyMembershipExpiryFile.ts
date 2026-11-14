import { existsSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import type {
  PaidExpiryQueryRow,
  RebuildLegacyMembershipExpiryFileResult,
} from './rebuildLegacyMembershipExpiryFileLib.js';
import {
  addUtcYears,
  buildPaidExpiryCsv,
  PAID_EXPIRY_SOURCE_SQL,
} from './rebuildLegacyMembershipExpiryFileLib.js';

function assertValidRebuildNow(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Membership expiry rebuild needs a valid time.');
  }
}

function dedupeV4Ids(v4Ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of v4Ids) {
    if (id === '' || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function findWorkersRepoRoot(start: string): string | null {
  let current = resolve(start);
  for (;;) {
    const hasGit = existsSync(resolve(current, '.git'));
    const hasWorkers = existsSync(resolve(current, 'apps', 'workers'));
    if (hasGit && hasWorkers) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function isInsideDirectory(root: string, target: string): boolean {
  const fromRoot = relative(root, target);
  if (fromRoot === '') {
    return true;
  }
  if (isAbsolute(fromRoot)) {
    return false;
  }
  return fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`);
}

function isArtifactsPath(root: string, target: string): boolean {
  const fromRoot = relative(root, target);
  return fromRoot === '.artifacts' || fromRoot.startsWith(`.artifacts${sep}`);
}

/**
 * The file contains emails. An absolute path may sit outside the repo, or under .artifacts.
 */
function resolveExpiryOutputPath(outputPath: string): string {
  if (!isAbsolute(outputPath)) {
    throw new Error('Membership expiry file path must be absolute.');
  }

  const resolved = resolve(outputPath);
  const repoRoot = findWorkersRepoRoot(process.cwd());
  if (
    repoRoot !== null &&
    isInsideDirectory(repoRoot, resolved) &&
    !isArtifactsPath(repoRoot, resolved)
  ) {
    throw new Error('Membership expiry file must stay outside the repo or under .artifacts.');
  }
  return resolved;
}

function requireV4DatabaseUrl(): string {
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  return connectionString;
}

async function readPaidExpiries(
  connectionString: string,
  v4Ids: readonly string[],
  capInstant: string
): Promise<PaidExpiryQueryRow[]> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<PaidExpiryQueryRow>(PAID_EXPIRY_SOURCE_SQL, [
      v4Ids,
      capInstant,
    ]);
    return result.rows;
  } catch (error) {
    throw new Error('Could not read v4 membership expiries.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

function logRebuildCounts(result: RebuildLegacyMembershipExpiryFileResult): void {
  getLogger().info('Rebuilt paid membership expiry file', {
    rowsWritten: result.rowsWritten,
    capped: result.capped,
    futureUncapped: result.futureUncapped,
    past: result.past,
    noGrant: result.noGrant,
    skippedInvalidEmail: result.skippedInvalidEmail,
    invalidExpiry: result.invalidExpiry,
    missingIds: result.missingIds.length,
    ambiguousIds: result.ambiguousIds.length,
  });
}

/**
 * Writes the paid-expiry CSV for the named v4 accounts. The caller deletes the file.
 * Counts are the only log fields.
 */
export async function rebuildLegacyMembershipExpiryFile(input: {
  v4Ids: readonly string[];
  outputPath: string;
  now: Date;
}): Promise<RebuildLegacyMembershipExpiryFileResult> {
  const { v4Ids, outputPath, now } = input;
  assertValidRebuildNow(now);
  const outputFile = resolveExpiryOutputPath(outputPath);
  const ids = dedupeV4Ids(v4Ids);
  const rows =
    ids.length === 0
      ? []
      : await readPaidExpiries(requireV4DatabaseUrl(), ids, addUtcYears(now, 5).toISOString());
  const built = buildPaidExpiryCsv(ids, rows, now);
  const { csv, ...result } = built;
  writeFileSync(outputFile, csv, 'utf8');
  logRebuildCounts(result);
  return result;
}
