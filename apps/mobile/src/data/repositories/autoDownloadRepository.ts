import { and, eq, inArray } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../db';
import type { AutoDownloadCandidateStatus } from '../../downloads/autoDownloadPlanner';
import {
  DEFAULT_AUTO_DOWNLOAD_ALLOW_CELLULAR,
  DEFAULT_AUTO_DOWNLOAD_ON_SUBSCRIBE,
  readAutoDownloadCellularDefaultEnabled,
  readAutoDownloadDefaultEnabled,
} from '../../prefs/downloadPrefs';

/**
 * Device-local auto-download settings and candidate ledger. Screens and the evaluate job read
 * through here; the server registration mirror is a separate sync job.
 */

export type ChannelAutoDownloadSource = 'directory' | 'add_by_rss';

export type ChannelAutoDownloadRecord = {
  allowCellular: boolean;
  channelIdText: string;
  enabled: boolean;
  enabledAtMs: number | null;
  source: ChannelAutoDownloadSource;
  updatedAtMs: number;
};

const toRecord = (row: typeof schema.channelAutoDownload.$inferSelect): ChannelAutoDownloadRecord => ({
  allowCellular: row.allowCellular === 1,
  channelIdText: row.channelIdText,
  enabled: row.enabled === 1,
  enabledAtMs: row.enabledAt,
  source: row.source === 'add_by_rss' ? 'add_by_rss' : 'directory',
  updatedAtMs: row.updatedAt,
});

export const autoDownloadRepository = {
  listEnabled: async (): Promise<ChannelAutoDownloadRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.channelAutoDownload)
      .where(eq(schema.channelAutoDownload.enabled, 1));
    return rows.map(toRecord);
  },

  listAll: async (): Promise<ChannelAutoDownloadRecord[]> => {
    await initializeDatabase();
    const rows = await getDb().select().from(schema.channelAutoDownload);
    return rows.map(toRecord);
  },

  getByChannelIdText: async (channelIdText: string): Promise<ChannelAutoDownloadRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.channelAutoDownload)
      .where(eq(schema.channelAutoDownload.channelIdText, channelIdText))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toRecord(row);
  },

  /**
   * Create or update a channel's auto-download row. Setting enabled true stamps `enabled_at` when
   * it was previously off or missing, so the watermark does not move on every toggle bounce.
   */
  upsertChannel: async (params: {
    allowCellular: boolean;
    channelIdText: string;
    enabled: boolean;
    source: ChannelAutoDownloadSource;
  }): Promise<ChannelAutoDownloadRecord> => {
    await initializeDatabase();
    const now = Date.now();
    const existing = await autoDownloadRepository.getByChannelIdText(params.channelIdText);
    let enabledAt: number | null = existing?.enabledAtMs ?? null;
    if (params.enabled && (existing === null || !existing.enabled)) {
      enabledAt = now;
    }
    if (!params.enabled) {
      enabledAt = existing?.enabledAtMs ?? null;
    }

    await getDb()
      .insert(schema.channelAutoDownload)
      .values({
        allowCellular: params.allowCellular ? 1 : 0,
        channelIdText: params.channelIdText,
        enabled: params.enabled ? 1 : 0,
        enabledAt,
        source: params.source,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.channelAutoDownload.channelIdText,
        set: {
          allowCellular: params.allowCellular ? 1 : 0,
          enabled: params.enabled ? 1 : 0,
          enabledAt,
          source: params.source,
          updatedAt: now,
        },
      });

    const next = await autoDownloadRepository.getByChannelIdText(params.channelIdText);
    if (next === null) {
      throw new Error('channel_auto_download upsert did not persist');
    }
    return next;
  },

  /** Snapshot global defaults into a new subscription's row when the global default is on. */
  seedFromGlobalDefaults: async (params: {
    channelIdText: string;
    source: ChannelAutoDownloadSource;
  }): Promise<ChannelAutoDownloadRecord | null> => {
    const [defaultEnabled, cellularDefault] = await Promise.all([
      readAutoDownloadDefaultEnabled(),
      readAutoDownloadCellularDefaultEnabled(),
    ]);
    if (!defaultEnabled) {
      return null;
    }
    return autoDownloadRepository.upsertChannel({
      allowCellular: cellularDefault,
      channelIdText: params.channelIdText,
      enabled: true,
      source: params.source,
    });
  },

  applyEnabledToAllSubscribed: async (params: {
    allowCellular: boolean;
    channelIdTexts: readonly string[];
    enabled: boolean;
    sourceForUnknown?: ChannelAutoDownloadSource;
  }): Promise<number> => {
    let count = 0;
    for (const channelIdText of params.channelIdTexts) {
      const existing = await autoDownloadRepository.getByChannelIdText(channelIdText);
      await autoDownloadRepository.upsertChannel({
        allowCellular: existing?.allowCellular ?? params.allowCellular,
        channelIdText,
        enabled: params.enabled,
        source: existing?.source ?? params.sourceForUnknown ?? 'directory',
      });
      count += 1;
    }
    return count;
  },

  applyCellularToEnabled: async (params: {
    allowCellular: boolean;
    channelIdTexts: readonly string[];
  }): Promise<number> => {
    let count = 0;
    for (const channelIdText of params.channelIdTexts) {
      const existing = await autoDownloadRepository.getByChannelIdText(channelIdText);
      if (existing === null || !existing.enabled) {
        continue;
      }
      await autoDownloadRepository.upsertChannel({
        allowCellular: params.allowCellular,
        channelIdText,
        enabled: true,
        source: existing.source,
      });
      count += 1;
    }
    return count;
  },

  removeChannel: async (channelIdText: string): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .delete(schema.channelAutoDownload)
      .where(eq(schema.channelAutoDownload.channelIdText, channelIdText));
    await getDb()
      .delete(schema.autoDownloadCandidate)
      .where(eq(schema.autoDownloadCandidate.channelIdText, channelIdText));
  },

  getCandidateStatuses: async (
    itemIdTexts: readonly string[]
  ): Promise<Map<string, AutoDownloadCandidateStatus>> => {
    await initializeDatabase();
    const map = new Map<string, AutoDownloadCandidateStatus>();
    if (itemIdTexts.length === 0) {
      return map;
    }
    const rows = await getDb()
      .select()
      .from(schema.autoDownloadCandidate)
      .where(inArray(schema.autoDownloadCandidate.itemIdText, [...itemIdTexts]));
    for (const row of rows) {
      if (
        row.status === 'pending' ||
        row.status === 'enqueued' ||
        row.status === 'skipped_ineligible' ||
        row.status === 'skipped_over_cap' ||
        row.status === 'user_removed'
      ) {
        map.set(row.itemIdText, row.status);
      }
    }
    return map;
  },

  listPendingItemIdTexts: async (): Promise<string[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ itemIdText: schema.autoDownloadCandidate.itemIdText })
      .from(schema.autoDownloadCandidate)
      .where(eq(schema.autoDownloadCandidate.status, 'pending'));
    return rows.map((row) => row.itemIdText);
  },

  setCandidateStatus: async (params: {
    channelIdText: string;
    itemIdText: string;
    status: AutoDownloadCandidateStatus;
  }): Promise<void> => {
    await initializeDatabase();
    const now = Date.now();
    await getDb()
      .insert(schema.autoDownloadCandidate)
      .values({
        channelIdText: params.channelIdText,
        itemIdText: params.itemIdText,
        status: params.status,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.autoDownloadCandidate.itemIdText,
        set: {
          channelIdText: params.channelIdText,
          status: params.status,
          updatedAt: now,
        },
      });
  },

  markUserRemoved: async (itemIdText: string): Promise<void> => {
    await initializeDatabase();
    const now = Date.now();
    const existing = await getDb()
      .select()
      .from(schema.autoDownloadCandidate)
      .where(eq(schema.autoDownloadCandidate.itemIdText, itemIdText))
      .limit(1);
    const row = existing[0];
    if (row === undefined) {
      return;
    }
    await getDb()
      .update(schema.autoDownloadCandidate)
      .set({ status: 'user_removed', updatedAt: now })
      .where(
        and(
          eq(schema.autoDownloadCandidate.itemIdText, itemIdText),
          eq(schema.autoDownloadCandidate.status, row.status)
        )
      );
  },

  /** Defaults used when seeding without reading storage (tests). */
  defaults: {
    allowCellular: DEFAULT_AUTO_DOWNLOAD_ALLOW_CELLULAR,
    enabled: DEFAULT_AUTO_DOWNLOAD_ON_SUBSCRIBE,
  },
};
