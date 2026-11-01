import { and, asc, eq, inArray } from 'drizzle-orm';

import type { ListenSessionReport } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getApiErrorStatus } from '../../lib/apiErrorStatus';
import { isEffectivelyOffline } from '../../net/connectivity';
import {
  getTasteProfileAgreementCurrentVersion,
  shouldSkipListenStatsForAccount,
} from '../../tasteProfileConsent/tasteProfileConsentGate';
import { getDb, initializeDatabase, schema } from '../db';
import type { StatsListenOutboxRow } from '../db/schema';
import { accountRepository } from './accountRepository';
import type { StatsListenOutboxRecord } from './statsListenOutbox';
import {
  classifyStatsListenSendFailure,
  isStatsListenOutboxRecordExpired,
  mergeStatsListenOutboxRecord,
  selectStatsListenOutboxEvictions,
  STATS_LISTEN_DRAIN_BATCH_LIMIT,
  STATS_LISTEN_OUTBOX_MAX_ROWS_PER_ACCOUNT,
  statsListenOutboxRecordFromReport,
  toStatsListenRequestBody,
} from './statsListenOutbox';
import type { MobileAuthRequestContext } from './types';

/**
 * Listen reports waiting for `POST /stats/listen`, one row per listen session, kept per account in
 * `stats_listen_outbox`. The playback tracker reports a session once it meets the counted-listen
 * rule; this repository stores the report and sends it when the app is online. A stats failure
 * never blocks or fails playback.
 */

const toRecord = (row: StatsListenOutboxRow): StatsListenOutboxRecord => ({
  clientListenId: row.clientListenId,
  accountIdText: row.accountIdText,
  targetKind: row.targetKind === 'clip' ? 'clip' : 'item',
  targetIdText: row.targetIdText,
  secondsHeard: row.secondsHeard,
  completed: row.completed === 1,
  firstReport: row.firstReport === 1,
  countedAtMs: row.countedAt,
  updatedAtMs: row.updatedAt,
  mediaDurationSeconds: row.mediaDurationSeconds,
});

const toRow = (record: StatsListenOutboxRecord): StatsListenOutboxRow => ({
  clientListenId: record.clientListenId,
  accountIdText: record.accountIdText,
  targetKind: record.targetKind,
  targetIdText: record.targetIdText,
  secondsHeard: record.secondsHeard,
  completed: record.completed ? 1 : 0,
  firstReport: record.firstReport ? 1 : 0,
  countedAt: record.countedAtMs,
  updatedAt: record.updatedAtMs,
  mediaDurationSeconds: record.mediaDurationSeconds,
});

const deleteByIds = async (clientListenIds: readonly string[]): Promise<void> => {
  if (clientListenIds.length === 0) {
    return;
  }
  await getDb()
    .delete(schema.statsListenOutbox)
    .where(inArray(schema.statsListenOutbox.clientListenId, [...clientListenIds]));
};

const evictOverflow = async (accountIdText: string): Promise<void> => {
  const rows = await getDb()
    .select({
      clientListenId: schema.statsListenOutbox.clientListenId,
      countedAt: schema.statsListenOutbox.countedAt,
    })
    .from(schema.statsListenOutbox)
    .where(eq(schema.statsListenOutbox.accountIdText, accountIdText));
  await deleteByIds(
    selectStatsListenOutboxEvictions(
      rows.map((row) => ({ clientListenId: row.clientListenId, countedAtMs: row.countedAt })),
      STATS_LISTEN_OUTBOX_MAX_ROWS_PER_ACCOUNT
    )
  );
};

const deleteExpired = async (accountIdText: string, nowMs: number): Promise<void> => {
  const rows = await getDb()
    .select()
    .from(schema.statsListenOutbox)
    .where(eq(schema.statsListenOutbox.accountIdText, accountIdText));
  await deleteByIds(
    rows
      .map(toRecord)
      .filter((record) => isStatsListenOutboxRecordExpired(record, nowMs))
      .map((record) => record.clientListenId)
  );
};

/** The server accepted `record`; a newer report of the same session that merged in meanwhile stays. */
const settleSentRecord = async (record: StatsListenOutboxRecord): Promise<void> => {
  await getDb()
    .delete(schema.statsListenOutbox)
    .where(
      and(
        eq(schema.statsListenOutbox.clientListenId, record.clientListenId),
        eq(schema.statsListenOutbox.updatedAt, record.updatedAtMs)
      )
    );
  await getDb()
    .update(schema.statsListenOutbox)
    .set({ firstReport: 0 })
    .where(eq(schema.statsListenOutbox.clientListenId, record.clientListenId));
};

const runDrainPass = async (
  context: MobileAuthRequestContext,
  accountIdText: string
): Promise<void> => {
  if (isEffectivelyOffline()) {
    return;
  }
  await initializeDatabase();
  const account = await accountRepository.getSnapshot();
  if (account === null || account.id_text !== accountIdText) {
    return;
  }
  if (account.account_settings?.listen_stats_accepted === false) {
    await getDb()
      .delete(schema.statsListenOutbox)
      .where(eq(schema.statsListenOutbox.accountIdText, accountIdText));
    return;
  }
  if (getTasteProfileAgreementCurrentVersion() === '' || shouldSkipListenStatsForAccount(account)) {
    return;
  }

  await deleteExpired(accountIdText, Date.now());

  const rows = await getDb()
    .select()
    .from(schema.statsListenOutbox)
    .where(eq(schema.statsListenOutbox.accountIdText, accountIdText))
    .orderBy(asc(schema.statsListenOutbox.countedAt))
    .limit(STATS_LISTEN_DRAIN_BATCH_LIMIT);

  for (const row of rows) {
    if (isEffectivelyOffline()) {
      return;
    }
    const record = toRecord(row);
    try {
      await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqStatsListen(toStatsListenRequestBody(record))
      );
    } catch (error) {
      if (classifyStatsListenSendFailure(getApiErrorStatus(error)) === 'retry') {
        return;
      }
      await deleteByIds([record.clientListenId]);
      continue;
    }
    await settleSentRecord(record);
  }
};

let drainInFlight: Promise<void> | null = null;

export const statsRepository = {
  /** Store one listen report for the account, then send pending reports unless offline. */
  recordListen: async (
    context: MobileAuthRequestContext,
    accountIdText: string,
    report: ListenSessionReport
  ): Promise<void> => {
    try {
      await initializeDatabase();
      const incoming = statsListenOutboxRecordFromReport({
        report,
        accountIdText,
        nowMs: Date.now(),
      });
      const existingRows = await getDb()
        .select()
        .from(schema.statsListenOutbox)
        .where(eq(schema.statsListenOutbox.clientListenId, report.clientListenId))
        .limit(1);
      const existingRow = existingRows[0];
      const merged = mergeStatsListenOutboxRecord(
        existingRow === undefined ? null : toRecord(existingRow),
        incoming
      );
      const row = toRow(merged);
      await getDb()
        .insert(schema.statsListenOutbox)
        .values(row)
        .onConflictDoUpdate({
          target: schema.statsListenOutbox.clientListenId,
          set: {
            secondsHeard: row.secondsHeard,
            completed: row.completed,
            firstReport: row.firstReport,
            countedAt: row.countedAt,
            updatedAt: row.updatedAt,
            mediaDurationSeconds: row.mediaDurationSeconds,
          },
        });
      await evictOverflow(accountIdText);
    } catch {
      // A stats write never fails playback.
    }
    if (!isEffectivelyOffline()) {
      void statsRepository.drainListens(context, accountIdText);
    }
  },

  /** Send the account's pending listen reports. Never rejects. */
  drainListens: async (context: MobileAuthRequestContext, accountIdText: string): Promise<void> => {
    if (drainInFlight !== null) {
      return drainInFlight;
    }
    const pass = (async (): Promise<void> => {
      try {
        await runDrainPass(context, accountIdText);
      } catch {
        // Unsent rows stay for the next drain.
      } finally {
        drainInFlight = null;
      }
    })();
    drainInFlight = pass;
    return pass;
  },
};
