import type { EntityManager } from 'typeorm';

import { StatsListenerService } from './statsListener.js';
import { lockListener, queryRows, readTransactionNow, utcDayBounds } from './statsWriteGuard.js';

/**
 * The listener-linked tables that hold listening data. An opt-out empties them and keeps the
 * listener row and anything kept for write limits, which the account's deletion removes.
 */
const LISTENING_DATA_TABLES = [
  'stats_listen_event',
  'stats_open_event',
  'stats_taste_profile',
  'stats_taste_profile_hidden',
  'stats_recommendation',
  'stats_channel_hidden',
  'stats_recommendation_state',
] as const;

const TODAY_STORED_LISTENS_SQL = `SELECT count(*)::int AS stored_count, min(created_at) AS first_stored_at
  FROM stats_listen_event
  WHERE listener_id = $1 AND created_at >= $2 AND created_at < $3`;

function earlierOf(a: Date | null, b: Date | null): Date | null {
  if (a === null) {
    return b;
  }
  if (b === null) {
    return a;
  }
  return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Deletes an account's stored listening data when the listener turns off Taste Profile consent:
 * listen events, open events, Taste Profile rows, Not Counted in Recommendations rows, Hidden
 * Recommendations rows, and recommendation rows. It keeps the listener row, and writes onto it how
 * many listens the deletion removed from the current UTC day, so write limits and flags kept by
 * listener id do not restart when the listener turns Taste Profile on again. Daily and range totals
 * have no listener column and stay. See docs/features/POPULARITY-AND-TASTE-PROFILE.md.
 */
export class ListeningDataDeletionService {
  /**
   * Runs inside the caller's transaction, which also records the No, so the decision and the
   * deletion commit together. Returns whether a listener row existed.
   */
  async deleteForAccount(account_id: number, manager: EntityManager): Promise<boolean> {
    const listenerService = new StatsListenerService();
    const listenerId = await listenerService.findListenerId(account_id, manager);
    if (listenerId === null) {
      return false;
    }
    await lockListener(manager, listenerId);
    const now = await readTransactionNow(manager);
    const today = utcDayBounds(now);

    const [stored] = await queryRows(manager, TODAY_STORED_LISTENS_SQL, [
      listenerId,
      today.start,
      today.end,
    ]);
    const storedToday = typeof stored?.stored_count === 'number' ? stored.stored_count : 0;
    const firstStoredToday =
      stored?.first_stored_at instanceof Date ? stored.first_stored_at : null;
    const earlier = await listenerService.readOptOutDayCarry(listenerId, today.day, manager);
    const storedCount = earlier.storedCount + storedToday;
    await listenerService.writeOptOutDayCarry(
      listenerId,
      storedCount === 0
        ? null
        : {
            day: today.day,
            storedCount,
            firstStoredAt: earlierOf(earlier.firstStoredAt, firstStoredToday),
          },
      manager
    );

    for (const table of LISTENING_DATA_TABLES) {
      await manager.query(`DELETE FROM ${table} WHERE listener_id = $1`, [listenerId]);
    }
    return true;
  }
}
