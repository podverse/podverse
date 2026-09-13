import { and, count, desc, eq, isNotNull, ne, sql } from 'drizzle-orm';

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
    channelIdText: row.channelIdText ?? null,
    channelTitle: row.channelTitle ?? null,
    dismissedFromList: row.dismissedFromList === 1,
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
  channelIdText: record.channelIdText,
  channelTitle: record.channelTitle,
  dismissedFromList: record.dismissedFromList ? 1 : 0,
  errorReason: record.errorReason,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

/**
 * Project the current set of completed downloads (files that exist on disk) to the native cache so
 * CarPlay / Android Auto / watch can list offline episodes without SQLite. Called after every
 * mutation (see nativeCache/projection.ts and the mobile-data-layer skill).
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
    | 'channelIdText'
    | 'channelTitle'
    | 'dismissedFromList'
  >
>;

export type UnsubscribedDownloadChannel = {
  channelIdText: string;
  title: string;
  imageUrl: string | null;
  downloadedCount: number;
};

/**
 * Downloads index repository — the source of truth for the phone Downloads library and
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

  /**
   * How many finished downloads each channel has, keyed by channel `id_text`.
   *
   * Prefers the persisted `channel_id_text` on the download row (survives unsubscribe). Falls back
   * to joining `channel_item` for rows that predate that column.
   */
  countCompletedByChannel: async (): Promise<Map<string, number>> => {
    await initializeDatabase();
    const fromColumn = await getDb()
      .select({
        channelIdText: schema.download.channelIdText,
        downloadedCount: count(schema.download.itemIdText),
      })
      .from(schema.download)
      .where(
        and(eq(schema.download.status, 'complete'), isNotNull(schema.download.channelIdText))
      )
      .groupBy(schema.download.channelIdText);

    const result = new Map<string, number>();
    for (const row of fromColumn) {
      if (row.channelIdText !== null) {
        result.set(row.channelIdText, row.downloadedCount);
      }
    }

    const fromJoin = await getDb()
      .select({
        channelIdText: schema.channelItem.channelIdText,
        downloadedCount: count(schema.download.itemIdText),
      })
      .from(schema.download)
      .innerJoin(schema.channelItem, eq(schema.channelItem.itemIdText, schema.download.itemIdText))
      .where(
        and(
          eq(schema.download.status, 'complete'),
          sql`${schema.download.channelIdText} IS NULL`
        )
      )
      .groupBy(schema.channelItem.channelIdText);

    for (const row of fromJoin) {
      result.set(
        row.channelIdText,
        (result.get(row.channelIdText) ?? 0) + row.downloadedCount
      );
    }

    return result;
  },

  /**
   * Channels that have at least one complete download and are not in the provided subscribed id
   * set. Used for Home's "Downloaded, not subscribed" footer.
   */
  listUnsubscribedDownloadChannels: async (
    subscribedIdTexts: ReadonlySet<string>
  ): Promise<UnsubscribedDownloadChannel[]> => {
    await initializeDatabase();
    const completed = await getDb()
      .select()
      .from(schema.download)
      .where(eq(schema.download.status, 'complete'));

    const byChannel = new Map<
      string,
      { title: string; imageUrl: string | null; count: number }
    >();

    for (const row of completed) {
      const channelId = row.channelIdText;
      if (channelId === null || channelId === '') {
        continue;
      }
      if (subscribedIdTexts.has(channelId)) {
        continue;
      }
      const existing = byChannel.get(channelId);
      if (existing === undefined) {
        byChannel.set(channelId, {
          count: 1,
          imageUrl: row.artworkUrl,
          title: row.channelTitle ?? channelId,
        });
      } else {
        existing.count += 1;
        if (existing.imageUrl === null && row.artworkUrl !== null) {
          existing.imageUrl = row.artworkUrl;
        }
      }
    }

    return [...byChannel.entries()]
      .map(([channelIdText, value]) => ({
        channelIdText,
        downloadedCount: value.count,
        imageUrl: value.imageUrl,
        title: value.title,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
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
    const { dismissedFromList, ...rest } = patch;
    const setValues: Record<string, string | number | null | undefined> = {
      ...rest,
      updatedAt: Date.now(),
    };
    if (dismissedFromList !== undefined) {
      setValues.dismissedFromList = dismissedFromList ? 1 : 0;
    }
    await getDb()
      .update(schema.download)
      .set(setValues)
      .where(eq(schema.download.itemIdText, itemIdText));
    await refreshNativeCacheProjection();
  },

  /** Mark every complete row as dismissed from the Downloads monitor list. */
  dismissAllFinished: async (): Promise<number> => {
    await initializeDatabase();
    const completed = await getDb()
      .select({ itemIdText: schema.download.itemIdText })
      .from(schema.download)
      .where(
        and(eq(schema.download.status, 'complete'), ne(schema.download.dismissedFromList, 1))
      );
    if (completed.length === 0) {
      return 0;
    }
    await getDb()
      .update(schema.download)
      .set({ dismissedFromList: 1, updatedAt: Date.now() })
      .where(eq(schema.download.status, 'complete'));
    await refreshNativeCacheProjection();
    return completed.length;
  },

  /** Remove a download row (delete-from-library). The file removal is handled by the runner. */
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
