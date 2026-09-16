import { and, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { DTOItem } from '@podverse/helpers/dto';

import type {
  DownloadMediaType,
  DownloadPatch,
  DownloadRecord,
  DownloadStatus,
} from '../../downloads/downloadTypes';
import { isDownloadMediaType, isDownloadStatus } from '../../downloads/downloadTypes';
import {
  groupUnsubscribedDownloadChannels,
  type UnsubscribedDownloadChannel,
} from '../../downloads/unsubscribedDownloadChannels';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
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

const UPDATE_CHUNK_SIZE = 200;

const chunked = <T>(values: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

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

export type { UnsubscribedDownloadChannel };

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
   * Finished downloads for one channel, most-recently-updated first.
   *
   * Prefers the persisted `channel_id_text` on the download row. Also includes rows that predate
   * that column when `channel_item` still ties the item to this channel.
   */
  listCompleteByChannel: async (channelIdText: string): Promise<DownloadRecord[]> => {
    await initializeDatabase();
    const fromColumn = await getDb()
      .select()
      .from(schema.download)
      .where(
        and(
          eq(schema.download.status, 'complete'),
          eq(schema.download.channelIdText, channelIdText)
        )
      )
      .orderBy(desc(schema.download.updatedAt));

    const fromJoin = await getDb()
      .select({ download: schema.download })
      .from(schema.download)
      .innerJoin(schema.channelItem, eq(schema.channelItem.itemIdText, schema.download.itemIdText))
      .where(
        and(
          eq(schema.download.status, 'complete'),
          eq(schema.channelItem.channelIdText, channelIdText),
          sql`${schema.download.channelIdText} IS NULL`
        )
      )
      .orderBy(desc(schema.download.updatedAt));

    const byId = new Map<string, DownloadRecord>();
    for (const row of fromColumn) {
      byId.set(row.itemIdText, rowToRecord(row));
    }
    for (const row of fromJoin) {
      if (!byId.has(row.download.itemIdText)) {
        byId.set(row.download.itemIdText, rowToRecord(row.download));
      }
    }

    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
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
      .where(and(eq(schema.download.status, 'complete'), isNotNull(schema.download.channelIdText)))
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
        and(eq(schema.download.status, 'complete'), sql`${schema.download.channelIdText} IS NULL`)
      )
      .groupBy(schema.channelItem.channelIdText);

    for (const row of fromJoin) {
      result.set(row.channelIdText, (result.get(row.channelIdText) ?? 0) + row.downloadedCount);
    }

    return result;
  },

  /**
   * Channels that have at least one complete download and are not in the provided subscribed id
   * set. Used for Home's "Downloaded only" footer.
   *
   * Prefers the persisted `channel_id_text` on the download row. Rows that never stored one
   * (episode payloads often omit the nested channel) fall back to `channel_item`, the same join
   * `countCompletedByChannel` uses.
   */
  listUnsubscribedDownloadChannels: async (
    subscribedIdTexts: ReadonlySet<string>
  ): Promise<UnsubscribedDownloadChannel[]> => {
    await initializeDatabase();
    const completed = await getDb()
      .select()
      .from(schema.download)
      .where(eq(schema.download.status, 'complete'));

    const missingItemIds = completed
      .filter((row) => row.channelIdText === null || row.channelIdText === '')
      .map((row) => row.itemIdText);

    const itemChannelByItemId = new Map<
      string,
      { channelIdText: string; imageUrl: string | null }
    >();
    if (missingItemIds.length > 0) {
      const hints = await getDb()
        .select({
          channelIdText: schema.channelItem.channelIdText,
          imageUrl: schema.channelItem.imageUrl,
          itemIdText: schema.channelItem.itemIdText,
        })
        .from(schema.channelItem)
        .where(inArray(schema.channelItem.itemIdText, missingItemIds));
      for (const hint of hints) {
        itemChannelByItemId.set(hint.itemIdText, {
          channelIdText: hint.channelIdText,
          imageUrl: hint.imageUrl,
        });
      }
    }

    const grouped = groupUnsubscribedDownloadChannels(
      completed.map((row) => ({
        artworkUrl: row.artworkUrl,
        channelIdText: row.channelIdText,
        channelTitle: row.channelTitle,
        itemIdText: row.itemIdText,
      })),
      subscribedIdTexts,
      itemChannelByItemId
    );

    // Rows that only found their channel via `channel_item` have no stored show title. One
    // stored payload per channel is enough when the feed embedded `channel.title`.
    for (const channel of grouped) {
      if (channel.title !== channel.channelIdText) {
        continue;
      }
      const payloadRows = await getDb()
        .select({ payloadJson: schema.channelItem.payloadJson })
        .from(schema.channelItem)
        .where(eq(schema.channelItem.channelIdText, channel.channelIdText))
        .limit(1);
      const payload = payloadRows[0]?.payloadJson;
      if (payload === undefined) {
        continue;
      }
      const item = safeJsonParse<DTOItem>(payload);
      const title = item?.channel?.title;
      if (title !== undefined && title !== null && title.length > 0) {
        channel.title = title;
      }
    }

    return grouped.sort((a, b) => a.title.localeCompare(b.title));
  },

  /**
   * Channels with at least one finished download, as recorded on the download rows themselves.
   * Item retention reads this so a show that only exists on this device keeps the stored episodes
   * that make it browsable and playable offline.
   */
  channelIdTextsWithCompleteDownloads: async (): Promise<string[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .selectDistinct({ channelIdText: schema.download.channelIdText })
      .from(schema.download)
      .where(and(eq(schema.download.status, 'complete'), isNotNull(schema.download.channelIdText)));

    return rows.flatMap((row) =>
      row.channelIdText === null || row.channelIdText.length === 0 ? [] : [row.channelIdText]
    );
  },

  /**
   * Record on the download row itself which show it belongs to.
   *
   * A downloaded file outlives every cache, so it has to carry that answer independently. The item
   * store holds only channels this device follows, so a download taken from a channel the user
   * never followed loses its one other link to the show as soon as that store is pruned — leaving
   * an episode on disk with nothing left to say where it came from.
   *
   * The title is written when the caller knows it. A caller that only knows the id still stamps the
   * id, and a later call carrying the title fills in what it left blank.
   */
  attachChannelToDownloads: async ({
    channelIdText,
    channelTitle = null,
  }: {
    channelIdText: string;
    channelTitle?: string | null;
  }): Promise<void> => {
    await initializeDatabase();

    const unlinked = await getDb()
      .select({ itemIdText: schema.download.itemIdText })
      .from(schema.download)
      .innerJoin(schema.channelItem, eq(schema.channelItem.itemIdText, schema.download.itemIdText))
      .where(
        and(
          eq(schema.channelItem.channelIdText, channelIdText),
          sql`${schema.download.channelIdText} IS NULL`
        )
      );

    for (const chunk of chunked(
      unlinked.map((row) => row.itemIdText),
      UPDATE_CHUNK_SIZE
    )) {
      await getDb()
        .update(schema.download)
        .set({ channelIdText, channelTitle })
        .where(inArray(schema.download.itemIdText, chunk));
    }

    if (channelTitle === null || channelTitle.length === 0) {
      return;
    }

    await getDb()
      .update(schema.download)
      .set({ channelTitle })
      .where(
        and(
          eq(schema.download.channelIdText, channelIdText),
          sql`(${schema.download.channelTitle} IS NULL OR ${schema.download.channelTitle} = '')`
        )
      );
  },

  /**
   * A display title already stored for this show: a sibling download, a cached episode payload
   * that embedded `channel.title`, or the local subscription row.
   */
  findStoredChannelTitle: async (channelIdText: string): Promise<string | null> => {
    await initializeDatabase();

    const fromDownload = await getDb()
      .select({ channelTitle: schema.download.channelTitle })
      .from(schema.download)
      .where(
        and(
          eq(schema.download.channelIdText, channelIdText),
          sql`(${schema.download.channelTitle} IS NOT NULL AND ${schema.download.channelTitle} != '')`
        )
      )
      .limit(1);
    const downloadTitle = fromDownload[0]?.channelTitle;
    if (downloadTitle !== undefined && downloadTitle !== null && downloadTitle.length > 0) {
      return downloadTitle;
    }

    const payloadRows = await getDb()
      .select({ payloadJson: schema.channelItem.payloadJson })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.channelIdText, channelIdText))
      .limit(1);
    const payload = payloadRows[0]?.payloadJson;
    if (payload !== undefined) {
      const item = safeJsonParse<DTOItem>(payload);
      const title = item?.channel?.title;
      if (title !== undefined && title !== null && title.trim().length > 0) {
        return title.trim();
      }
    }

    const subscribed = await getDb()
      .select({ title: schema.subscribedChannel.title })
      .from(schema.subscribedChannel)
      .where(eq(schema.subscribedChannel.idText, channelIdText))
      .limit(1);
    const subscribedTitle = subscribed[0]?.title;
    if (subscribedTitle !== undefined && subscribedTitle.trim().length > 0) {
      return subscribedTitle.trim();
    }

    return null;
  },

  /**
   * Fill download rows that have a channel id (or can recover one from `channel_item`) but no
   * title. Returns how many channels received a title so the caller can re-read the list.
   */
  backfillMissingChannelTitles: async (): Promise<number> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        channelIdText: schema.download.channelIdText,
        channelTitle: schema.download.channelTitle,
        itemIdText: schema.download.itemIdText,
      })
      .from(schema.download);

    const missing = rows.filter(
      (row) => row.channelTitle === null || row.channelTitle.length === 0
    );
    if (missing.length === 0) {
      return 0;
    }

    const unlinkedIds = missing
      .filter((row) => row.channelIdText === null || row.channelIdText.length === 0)
      .map((row) => row.itemIdText);

    const discoveredIds = new Set<string>();
    for (const row of missing) {
      if (row.channelIdText !== null && row.channelIdText.length > 0) {
        discoveredIds.add(row.channelIdText);
      }
    }

    if (unlinkedIds.length > 0) {
      const hints = await getDb()
        .select({
          channelIdText: schema.channelItem.channelIdText,
          itemIdText: schema.channelItem.itemIdText,
        })
        .from(schema.channelItem)
        .where(inArray(schema.channelItem.itemIdText, unlinkedIds));
      for (const hint of hints) {
        discoveredIds.add(hint.channelIdText);
      }
    }

    let filled = 0;
    for (const channelIdText of discoveredIds) {
      const channelTitle = await downloadsRepository.findStoredChannelTitle(channelIdText);
      if (channelTitle === null) {
        continue;
      }
      await downloadsRepository.attachChannelToDownloads({ channelIdText, channelTitle });
      filled += 1;
    }

    return filled;
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
   * Patch a subset of columns for an existing download (status transition, resolved path, error).
   * Bumps `updated_at` and re-projects. No-op if the row is missing.
   *
   * Byte progress goes through `patchProgress` instead — see the note there.
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

  /**
   * Persist transfer byte counts so an interrupted download can resume near where it stopped.
   *
   * Deliberately narrower than `patch`: byte movement cannot change which downloads are complete,
   * so it must not rebuild the native-cache index, and it leaves `updated_at` alone so a list of
   * in-flight rows holds its order instead of reshuffling on every chunk. The caller throttles
   * these writes; the live value the UI renders lives in `downloadStore`.
   */
  patchProgress: async (
    itemIdText: string,
    progress: { bytesDownloaded: number; byteSize: number | null }
  ): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.download)
      .set({ byteSize: progress.byteSize, bytesDownloaded: progress.bytesDownloaded })
      .where(eq(schema.download.itemIdText, itemIdText));
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
