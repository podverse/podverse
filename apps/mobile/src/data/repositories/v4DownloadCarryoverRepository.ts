import { eq, inArray } from 'drizzle-orm';

import type {
  V4DownloadSource,
  V4DownloadStagedEntry,
} from '../../migration/v4/parseV4DownloadState';
import { getDb, initializeDatabase, schema } from '../db';

const READ_AT_KEY = 'v4_download_carryover.read_at';
const SHARED_FOLDER_KEY = 'v4_download_carryover.shared_folder';
const INSERT_CHUNK = 30;

/**
 * - `pending`: not resolved yet, or a pass stopped before reaching it (offline, time budget).
 * - `waiting`: a retryable failure (an HTTP error, an unreadable folder, a failed copy). Retried
 *   once per app process; `attempts` counts the failures.
 * - `directory`: adopted as a finished download of a directory episode.
 * - `add_by_rss`: adopted onto an Add by RSS feed, as a feed episode or a local episode.
 * - `duplicate`: this phone already had that episode downloaded; the v4 copy was deleted.
 * - `deleted`: could not migrate; the file was deleted.
 * - `missing`: no file was found in any place v4 wrote to.
 * - `unreachable`: the file sits in a shared folder this app can no longer read.
 * - `delete_failed`: could not migrate, and deleting the file kept failing.
 */
export const V4_DOWNLOAD_CARRYOVER_STATUSES = [
  'pending',
  'waiting',
  'directory',
  'add_by_rss',
  'duplicate',
  'deleted',
  'missing',
  'unreachable',
  'delete_failed',
] as const;
export type V4DownloadCarryoverStatus = (typeof V4_DOWNLOAD_CARRYOVER_STATUSES)[number];

/**
 * Error-log code for a download carryover pass that left no pending row. Counts live on the
 * detail fields.
 */
export const V4_DOWNLOAD_CARRYOVER_DONE_CODE = 'v4_download_carryover_done';

export type V4DownloadCarryoverRow = V4DownloadStagedEntry & {
  status: V4DownloadCarryoverStatus;
  attempts: number;
  adoptedFileName: string | null;
  updatedAt: number;
};

export type V4DownloadCarryoverCounts = {
  bySource: Record<V4DownloadSource, number>;
  byStatus: Record<V4DownloadCarryoverStatus, number>;
  total: number;
};

const DOWNLOAD_SOURCES = ['downloaded', 'downloading', 'orphan'] as const;
const ORPHAN_ROOTS = ['app_external_files', 'app_documents'] as const;

type DownloadOrphanRoot = (typeof ORPHAN_ROOTS)[number];

const isDownloadSource = (value: string): value is V4DownloadSource =>
  DOWNLOAD_SOURCES.some((source) => source === value);

const isDownloadStatus = (value: string): value is V4DownloadCarryoverStatus =>
  V4_DOWNLOAD_CARRYOVER_STATUSES.some((status) => status === value);

const isOrphanRoot = (value: string): value is DownloadOrphanRoot =>
  ORPHAN_ROOTS.some((root) => root === value);

const readKv = async (key: string): Promise<string | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
};

const toRow = (
  row: typeof schema.v4DownloadCarryoverEntry.$inferSelect
): V4DownloadCarryoverRow | null => {
  if (!isDownloadSource(row.source) || !isDownloadStatus(row.status)) {
    return null;
  }
  let orphanRoot: V4DownloadStagedEntry['orphanRoot'] = null;
  if (row.orphanRoot !== null) {
    if (!isOrphanRoot(row.orphanRoot)) {
      return null;
    }
    orphanRoot = row.orphanRoot;
  }
  return {
    addByRssFeedUrl: row.addByRssFeedUrl,
    adoptedFileName: row.adoptedFileName,
    attempts: row.attempts,
    episodeDurationSeconds: row.episodeDurationSeconds,
    episodeGuid: row.episodeGuid,
    episodeImageUrl: row.episodeImageUrl,
    episodeMediaType: row.episodeMediaType,
    episodePubDateMs: row.episodePubDateMs,
    episodeTitle: row.episodeTitle,
    fileKey: row.fileKey,
    isAddByRss: row.isAddByRss === 1,
    legacyEpisodeId: row.legacyEpisodeId,
    legacyExtension: row.legacyExtension,
    legacyPodcastId: row.legacyPodcastId,
    mediaUrl: row.mediaUrl,
    orphanRoot,
    podcastFeedUrl: row.podcastFeedUrl,
    podcastGuid: row.podcastGuid,
    podcastImageUrl: row.podcastImageUrl,
    podcastIndexId: row.podcastIndexId,
    podcastTitle: row.podcastTitle,
    source: row.source,
    status: row.status,
    updatedAt: row.updatedAt,
  };
};

const emptyCounts = (): V4DownloadCarryoverCounts => {
  const byStatus: Record<V4DownloadCarryoverStatus, number> = {
    pending: 0,
    waiting: 0,
    directory: 0,
    add_by_rss: 0,
    duplicate: 0,
    deleted: 0,
    missing: 0,
    unreachable: 0,
    delete_failed: 0,
  };
  return {
    bySource: { downloaded: 0, downloading: 0, orphan: 0 },
    byStatus,
    total: 0,
  };
};

/**
 * Staged media files from a finished read of the previous app's download lists and folders.
 *
 * `v4_download_carryover.read_at` is written only by `saveRead`, including when that read
 * named no file. `v4_download_carryover.shared_folder` stores the raw folder text from that
 * read. Rows are device data: ending a session does not delete them. URLs have no userinfo.
 * `adoptedFileName` is a file name under `downloads/`, never an absolute path.
 */
export const v4DownloadCarryoverRepository = {
  bumpAttempts: async (fileKey: string): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    await getDb().transaction(async (transaction) => {
      const rows = await transaction
        .select({ attempts: schema.v4DownloadCarryoverEntry.attempts })
        .from(schema.v4DownloadCarryoverEntry)
        .where(eq(schema.v4DownloadCarryoverEntry.fileKey, fileKey))
        .limit(1);
      const current = rows[0];
      if (current === undefined) {
        return;
      }
      await transaction
        .update(schema.v4DownloadCarryoverEntry)
        .set({ attempts: current.attempts + 1, updatedAt })
        .where(eq(schema.v4DownloadCarryoverEntry.fileKey, fileKey));
    });
  },

  /** Drops staged rows and both markers so the read can run again. */
  clearRead: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction.delete(schema.v4DownloadCarryoverEntry);
      await transaction
        .delete(schema.kvMeta)
        .where(inArray(schema.kvMeta.key, [READ_AT_KEY, SHARED_FOLDER_KEY]));
    });
  },

  counts: async (): Promise<V4DownloadCarryoverCounts> => {
    await initializeDatabase();
    const rows = await getDb().select().from(schema.v4DownloadCarryoverEntry);
    const counts = emptyCounts();
    for (const row of rows) {
      const mapped = toRow(row);
      if (mapped === null) {
        continue;
      }
      counts.total += 1;
      counts.bySource[mapped.source] += 1;
      counts.byStatus[mapped.status] += 1;
    }
    return counts;
  },

  getSharedFolder: async (): Promise<string | null> => readKv(SHARED_FOLDER_KEY),

  hasRead: async (): Promise<boolean> => (await readKv(READ_AT_KEY)) !== null,

  listByStatus: async (
    statuses: readonly V4DownloadCarryoverStatus[]
  ): Promise<V4DownloadCarryoverRow[]> => {
    if (statuses.length === 0) {
      return [];
    }
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.v4DownloadCarryoverEntry)
      .where(inArray(schema.v4DownloadCarryoverEntry.status, [...statuses]));
    const listed: V4DownloadCarryoverRow[] = [];
    for (const row of rows) {
      const mapped = toRow(row);
      if (mapped !== null) {
        listed.push(mapped);
      }
    }
    return listed;
  },

  saveRead: async (input: {
    entries: readonly V4DownloadStagedEntry[];
    sharedFolder: string | null;
  }): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    await getDb().transaction(async (transaction) => {
      for (let index = 0; index < input.entries.length; index += INSERT_CHUNK) {
        const chunk = input.entries.slice(index, index + INSERT_CHUNK).map((entry) => ({
          addByRssFeedUrl: entry.addByRssFeedUrl,
          adoptedFileName: null,
          attempts: 0,
          episodeDurationSeconds: entry.episodeDurationSeconds,
          episodeGuid: entry.episodeGuid,
          episodeImageUrl: entry.episodeImageUrl,
          episodeMediaType: entry.episodeMediaType,
          episodePubDateMs: entry.episodePubDateMs,
          episodeTitle: entry.episodeTitle,
          fileKey: entry.fileKey,
          isAddByRss: entry.isAddByRss ? 1 : 0,
          legacyEpisodeId: entry.legacyEpisodeId,
          legacyExtension: entry.legacyExtension,
          legacyPodcastId: entry.legacyPodcastId,
          mediaUrl: entry.mediaUrl,
          orphanRoot: entry.orphanRoot,
          podcastFeedUrl: entry.podcastFeedUrl,
          podcastGuid: entry.podcastGuid,
          podcastImageUrl: entry.podcastImageUrl,
          podcastIndexId: entry.podcastIndexId,
          podcastTitle: entry.podcastTitle,
          source: entry.source,
          status: 'pending' as const,
          updatedAt,
        }));
        await transaction
          .insert(schema.v4DownloadCarryoverEntry)
          .values(chunk)
          .onConflictDoNothing({
            target: [schema.v4DownloadCarryoverEntry.fileKey],
          });
      }
      if (input.sharedFolder !== null) {
        await transaction
          .insert(schema.kvMeta)
          .values({ key: SHARED_FOLDER_KEY, updatedAt, value: input.sharedFolder })
          .onConflictDoUpdate({
            target: schema.kvMeta.key,
            set: { updatedAt, value: input.sharedFolder },
          });
      } else {
        await transaction.delete(schema.kvMeta).where(eq(schema.kvMeta.key, SHARED_FOLDER_KEY));
      }
      await transaction
        .insert(schema.kvMeta)
        .values({ key: READ_AT_KEY, updatedAt, value: String(updatedAt) })
        .onConflictDoUpdate({
          target: schema.kvMeta.key,
          set: { updatedAt, value: String(updatedAt) },
        });
    });
  },

  setAdoptedFileName: async (fileKey: string, fileName: string | null): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.v4DownloadCarryoverEntry)
      .set({ adoptedFileName: fileName, updatedAt: Date.now() })
      .where(eq(schema.v4DownloadCarryoverEntry.fileKey, fileKey));
  },

  setStatus: async (fileKey: string, status: V4DownloadCarryoverStatus): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.v4DownloadCarryoverEntry)
      .set({ status, updatedAt: Date.now() })
      .where(eq(schema.v4DownloadCarryoverEntry.fileKey, fileKey));
  },
};
