import { desc, eq } from 'drizzle-orm';

import type {
  DownloadMediaType,
  DownloadRecord,
  DownloadStatus,
} from '../../downloads/downloadTypes';
import { isDownloadMediaType, isDownloadStatus } from '../../downloads/downloadTypes';
import { getDb, initializeDatabase, schema } from '../db';
import type { DownloadRow } from '../db/schema';
import { projectDownloadsIndexToNativeCache } from '../nativeCache';

const rowToRecord = (row: DownloadRow): DownloadRecord => {
  const mediaType: DownloadMediaType = isDownloadMediaType(row.mediaType) ? row.mediaType : 'audio';
  const status: DownloadStatus = isDownloadStatus(row.status) ? row.status : 'queued';
  return {
    itemIdText: row.itemIdText,
    enclosureUri: row.enclosureUri,
    enclosureUrlHash: row.enclosureUrlHash,
    enclosureMime: row.enclosureMime,
    mediaType,
    fileExtension: row.fileExtension,
    filePath: row.filePath,
    byteSize: row.byteSize,
    bytesDownloaded: row.bytesDownloaded,
    status,
    title: row.title,
    artworkUrl: row.artworkUrl,
    errorReason: row.errorReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const recordToRow = (record: DownloadRecord): DownloadRow => ({
  itemIdText: record.itemIdText,
  enclosureUri: record.enclosureUri,
  enclosureUrlHash: record.enclosureUrlHash,
  enclosureMime: record.enclosureMime,
  mediaType: record.mediaType,
  fileExtension: record.fileExtension,
  filePath: record.filePath,
  byteSize: record.byteSize,
  bytesDownloaded: record.bytesDownloaded,
  status: record.status,
  title: record.title,
  artworkUrl: record.artworkUrl,
  errorReason: record.errorReason,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

/**
 * Project the current set of completed downloads (files that exist on disk) to the native cache so
 * CarPlay / Android Auto / watch can list offline episodes without SQLite. Called after every
 * mutation — stub until Track 12 (see nativeCache/projection.ts, DOCS-MOBILE-DATA-LAYER-OFFLINE §7.1).
 */
const refreshNativeCacheProjection = async (): Promise<void> => {
  const rows = await getDb()
    .select({
      itemIdText: schema.download.itemIdText,
      title: schema.download.title,
      filePath: schema.download.filePath,
      status: schema.download.status,
    })
    .from(schema.download)
    .where(eq(schema.download.status, 'complete'));

  await projectDownloadsIndexToNativeCache({
    entries: rows.flatMap((row) => {
      if (row.filePath === null) {
        return [];
      }
      return [
        { idText: row.itemIdText, title: row.title ?? row.itemIdText, filePath: row.filePath },
      ];
    }),
  });
};

/** Fields callers may patch as a download progresses (id + immutable columns excluded). */
export type DownloadPatch = Partial<
  Pick<
    DownloadRecord,
    | 'status'
    | 'filePath'
    | 'byteSize'
    | 'bytesDownloaded'
    | 'errorReason'
    | 'title'
    | 'artworkUrl'
    | 'enclosureUri'
    | 'enclosureMime'
    | 'fileExtension'
  >
>;

/**
 * Downloads index repository (Phase F) — the source of truth for the phone Downloads library and
 * local-file playback. Only progressive (non-live, non-HLS) items reach here; eligibility is gated
 * by `isItemDownloadable` at the call site before `upsert`. Every mutation projects the completed
 * set to the native cache (see mobile-data-layer skill).
 */
export const downloadsRepository = {
  /** All downloads, most-recently-updated first (offline-capable list). */
  list: async (): Promise<DownloadRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.download)
      .orderBy(desc(schema.download.updatedAt));
    return rows.map(rowToRecord);
  },

  /** Downloads in a given status (e.g. `complete` for the library, `queued` to drive the runner). */
  listByStatus: async (status: DownloadStatus): Promise<DownloadRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.download)
      .where(eq(schema.download.status, status))
      .orderBy(desc(schema.download.updatedAt));
    return rows.map(rowToRecord);
  },

  getByItemIdText: async (itemIdText: string): Promise<DownloadRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.download)
      .where(eq(schema.download.itemIdText, itemIdText))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  /** Insert or replace a download row (e.g. enqueue). Projects the completed set on success. */
  upsert: async (record: DownloadRecord): Promise<void> => {
    await initializeDatabase();
    const values = recordToRow(record);
    await getDb()
      .insert(schema.download)
      .values(values)
      .onConflictDoUpdate({ target: schema.download.itemIdText, set: values });
    await refreshNativeCacheProjection();
  },

  /**
   * Patch a subset of columns for an existing download (progress, status transition, error). Bumps
   * `updated_at` and re-projects. No-op if the row is missing.
   */
  patch: async (itemIdText: string, patch: DownloadPatch): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.download)
      .set({ ...patch, updatedAt: Date.now() })
      .where(eq(schema.download.itemIdText, itemIdText));
    await refreshNativeCacheProjection();
  },

  /** Remove a download row (delete-from-library). The file removal is handled by the runner (13.4). */
  remove: async (itemIdText: string): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.download).where(eq(schema.download.itemIdText, itemIdText));
    await refreshNativeCacheProjection();
  },

  /** Clear all downloads (session reset / logout). Projects an empty set. */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.download);
    await refreshNativeCacheProjection();
  },
};
