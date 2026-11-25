import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { readQueryResultRows } from '@orm/lib/queryResultRows.js';
import type { CatalogAllowlistOrigin } from '@orm/services/feed/catalogPodcastIndexAllowlistSync.js';
import { planDeploymentAllowlistSync } from '@orm/services/feed/catalogPodcastIndexAllowlistSync.js';

export type CatalogAllowlistChannelMove = {
  from: number;
  to_channel_id_text: string;
};

export type CatalogAllowlistLookupRecord = {
  listedPodcastIndexId: number;
  /** Null when the listed id is the live id. */
  resolvedPodcastIndexId: number | null;
  title: string | null;
  feedUrl: string | null;
};

export type CatalogAllowlistManagementRow = {
  podcast_index_id: number;
  resolved_podcast_index_id: number | null;
  origin: CatalogAllowlistOrigin;
  title: string | null;
  feed_url: string | null;
  stored: boolean;
  removable: boolean;
};

export type CatalogAllowlistInsertResult = 'created' | 'already';

export type CatalogAllowlistRemoveResult = 'removed' | 'missing' | 'deployment' | 'on_env_list';

type StoredRow = {
  podcastIndexId: number;
  resolvedPodcastIndexId: number | null;
  origin: CatalogAllowlistOrigin;
  title: string | null;
  feedUrl: string | null;
};

const ORM_CONTEXT_MISSING = 'ORM context not initialized';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integerField(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function nullableIntegerField(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  return integerField(row, key);
}

function textField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function originField(row: Record<string, unknown>): CatalogAllowlistOrigin | null {
  const value = row.origin;
  return value === 'deployment' || value === 'admin' ? value : null;
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  const rows = readQueryResultRows(value);
  if (rows === null) {
    return [];
  }
  return rows.filter(isRecord);
}

function uniquePositiveIds(ids: readonly number[]): number[] {
  const seen = new Set<number>();
  const unique: number[] = [];
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 1 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function isMissingOrmContext(error: unknown): boolean {
  return error instanceof Error && error.message.includes(ORM_CONTEXT_MISSING);
}

function readStoredRow(row: Record<string, unknown>): StoredRow | null {
  const podcastIndexId = integerField(row, 'podcast_index_id');
  const origin = originField(row);
  if (podcastIndexId === null || origin === null) {
    return null;
  }
  return {
    podcastIndexId,
    resolvedPodcastIndexId: nullableIntegerField(row, 'resolved_podcast_index_id'),
    origin,
    title: textField(row, 'title'),
    feedUrl: textField(row, 'feed_url'),
  };
}

/**
 * True when any of these Podcast Index ids is a listed id or a resolved id on the allowlist
 * table. A process with no ORM context is treated as not listed so unit tests stay closed.
 * A query failure is rethrown.
 */
export async function catalogAllowlistTableAdmits(
  podcastIndexIds: readonly number[]
): Promise<boolean> {
  const ids = uniquePositiveIds(podcastIndexIds);
  if (ids.length === 0) {
    return false;
  }
  try {
    if (!AppDataSourceRead.isInitialized) {
      return false;
    }
    const result: unknown = await AppDataSourceRead.manager.query(
      `SELECT 1
       FROM catalog_podcast_index_allowlist
       WHERE podcast_index_id = ANY($1::int[])
          OR resolved_podcast_index_id = ANY($1::int[])
       LIMIT 1`,
      [ids]
    );
    return rowsOf(result).length > 0;
  } catch (error) {
    if (isMissingOrmContext(error)) {
      return false;
    }
    throw error;
  }
}

export class CatalogPodcastIndexAllowlistService {
  async listRows(): Promise<StoredRow[]> {
    const result: unknown = await AppDataSourceRead.manager.query(
      `SELECT podcast_index_id, resolved_podcast_index_id, origin, title, feed_url
       FROM catalog_podcast_index_allowlist`
    );
    const rows: StoredRow[] = [];
    for (const row of rowsOf(result)) {
      const stored = readStoredRow(row);
      if (stored !== null) {
        rows.push(stored);
      }
    }
    return rows;
  }

  async syncDeployment(envIds: readonly number[]): Promise<void> {
    const rows = await this.listRows();
    const plan = planDeploymentAllowlistSync(rows, envIds);
    await AppDataSourceReadWrite.transaction(async (manager) => {
      if (plan.deleteIds.length > 0) {
        await manager.query(
          `DELETE FROM catalog_podcast_index_allowlist
           WHERE origin = 'deployment'
             AND podcast_index_id = ANY($1::int[])`,
          [plan.deleteIds]
        );
      }
      if (plan.insertIds.length > 0) {
        await manager.query(
          `INSERT INTO catalog_podcast_index_allowlist
             (podcast_index_id, origin, created_at, updated_at)
           SELECT id, 'deployment', now(), now()
           FROM unnest($1::int[]) AS id
           ON CONFLICT (podcast_index_id) DO NOTHING`,
          [plan.insertIds]
        );
      }
    });
  }

  async saveLookupRecords(records: readonly CatalogAllowlistLookupRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await AppDataSourceReadWrite.transaction(async (manager) => {
      for (const record of records) {
        await manager.query(
          `UPDATE catalog_podcast_index_allowlist
           SET resolved_podcast_index_id = $2,
               title = COALESCE($3, title),
               feed_url = COALESCE($4, feed_url),
               updated_at = now()
           WHERE podcast_index_id = $1`,
          [record.listedPodcastIndexId, record.resolvedPodcastIndexId, record.title, record.feedUrl]
        );
      }
    });
  }

  async listForManagement(envIds: readonly number[]): Promise<CatalogAllowlistManagementRow[]> {
    const [rows, storedIds] = await Promise.all([this.listRows(), this.storedPodcastIndexIds()]);
    const env = new Set(envIds);
    const byId = new Map(rows.map((row) => [row.podcastIndexId, row]));
    const listed: CatalogAllowlistManagementRow[] = [];
    for (const id of env) {
      if (!byId.has(id)) {
        listed.push({
          podcast_index_id: id,
          resolved_podcast_index_id: null,
          origin: 'deployment',
          title: null,
          feed_url: null,
          stored: storedIds.has(id),
          removable: false,
        });
      }
    }
    for (const row of rows) {
      const resolved = row.resolvedPodcastIndexId;
      listed.push({
        podcast_index_id: row.podcastIndexId,
        resolved_podcast_index_id: resolved,
        origin: row.origin,
        title: row.title,
        feed_url: row.feedUrl,
        stored: storedIds.has(row.podcastIndexId) || (resolved !== null && storedIds.has(resolved)),
        removable: row.origin === 'admin' && !env.has(row.podcastIndexId),
      });
    }
    listed.sort((left, right) => left.podcast_index_id - right.podcast_index_id);
    return listed;
  }

  async insertAdmin(params: {
    podcastIndexId: number;
    title: string | null;
    feedUrl: string | null;
    adminId: number | null;
    envIds: readonly number[];
  }): Promise<CatalogAllowlistInsertResult> {
    if (params.envIds.includes(params.podcastIndexId)) {
      return 'already';
    }
    const existing = await this.listRows();
    if (existing.some((row) => row.podcastIndexId === params.podcastIndexId)) {
      return 'already';
    }
    if (
      existing.some(
        (row) =>
          row.resolvedPodcastIndexId !== null &&
          row.resolvedPodcastIndexId === params.podcastIndexId
      )
    ) {
      return 'already';
    }
    await AppDataSourceReadWrite.manager.query(
      `INSERT INTO catalog_podcast_index_allowlist
         (podcast_index_id, origin, title, feed_url, created_by_admin_id, created_at, updated_at)
       VALUES ($1, 'admin', $2, $3, $4, now(), now())
       ON CONFLICT (podcast_index_id) DO NOTHING`,
      [params.podcastIndexId, params.title, params.feedUrl, params.adminId]
    );
    return 'created';
  }

  async removeAdmin(
    podcastIndexId: number,
    envIds: readonly number[]
  ): Promise<CatalogAllowlistRemoveResult> {
    if (envIds.includes(podcastIndexId)) {
      return 'on_env_list';
    }
    const rows = await this.listRows();
    const row = rows.find((entry) => entry.podcastIndexId === podcastIndexId);
    if (row === undefined) {
      return 'missing';
    }
    if (row.origin !== 'admin') {
      return 'deployment';
    }
    await AppDataSourceReadWrite.manager.query(
      `DELETE FROM catalog_podcast_index_allowlist
       WHERE podcast_index_id = $1
         AND origin = 'admin'`,
      [podcastIndexId]
    );
    return 'removed';
  }

  /**
   * The Podcast Index id to load for a listed id the directory moved. Follows an applied merge
   * of that current id when one exists. Null when this listed id has no alias.
   */
  async storedPodcastIndexIdForAlias(listedPodcastIndexId: number): Promise<number | null> {
    const result: unknown = await AppDataSourceRead.manager.query(
      `SELECT CASE
                WHEN merge.to_podcast_index_id IS NOT NULL THEN merge.to_podcast_index_id
                ELSE row.resolved_podcast_index_id
              END AS podcast_index_id
       FROM catalog_podcast_index_allowlist row
       LEFT JOIN LATERAL (
         SELECT to_podcast_index_id
         FROM channel_merge
         WHERE from_podcast_index_id = row.resolved_podcast_index_id
           AND status = 'applied'
           AND to_podcast_index_id IS NOT NULL
         ORDER BY applied_at DESC NULLS LAST, id DESC
         LIMIT 1
       ) merge ON true
       WHERE row.podcast_index_id = $1
         AND row.resolved_podcast_index_id IS NOT NULL
         AND row.resolved_podcast_index_id <> row.podcast_index_id`,
      [listedPodcastIndexId]
    );
    const row = rowsOf(result)[0];
    if (row === undefined) {
      return null;
    }
    return integerField(row, 'podcast_index_id');
  }

  async channelMovesForListedIds(
    podcastIndexIds: readonly number[]
  ): Promise<CatalogAllowlistChannelMove[]> {
    const ids = uniquePositiveIds(podcastIndexIds);
    if (ids.length === 0) {
      return [];
    }
    const result: unknown = await AppDataSourceRead.manager.query(
      `SELECT row.podcast_index_id AS from_podcast_index_id,
              channel.id_text AS to_id_text
       FROM catalog_podcast_index_allowlist row
       LEFT JOIN LATERAL (
         SELECT to_podcast_index_id
         FROM channel_merge
         WHERE from_podcast_index_id = row.resolved_podcast_index_id
           AND status = 'applied'
           AND to_podcast_index_id IS NOT NULL
         ORDER BY applied_at DESC NULLS LAST, id DESC
         LIMIT 1
       ) merge ON true
       INNER JOIN feed
         ON feed.podcast_index_id = COALESCE(merge.to_podcast_index_id, row.resolved_podcast_index_id)
       INNER JOIN channel ON channel.feed_id = feed.id
       WHERE row.podcast_index_id = ANY($1::int[])
         AND row.resolved_podcast_index_id IS NOT NULL
         AND row.resolved_podcast_index_id <> row.podcast_index_id`,
      [ids]
    );
    const moves: CatalogAllowlistChannelMove[] = [];
    for (const row of rowsOf(result)) {
      const from = integerField(row, 'from_podcast_index_id');
      const to = textField(row, 'to_id_text');
      if (from !== null && to !== null) {
        moves.push({ from, to_channel_id_text: to });
      }
    }
    return moves;
  }

  private async storedPodcastIndexIds(): Promise<Set<number>> {
    const result: unknown = await AppDataSourceRead.manager.query(
      `SELECT podcast_index_id FROM feed WHERE podcast_index_id IS NOT NULL`
    );
    const ids = new Set<number>();
    for (const row of rowsOf(result)) {
      const id = integerField(row, 'podcast_index_id');
      if (id !== null) {
        ids.add(id);
      }
    }
    return ids;
  }
}
