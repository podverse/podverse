import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { StatsListener } from '@orm/entities/stats/statsListener.js';
import type { EntityManager } from 'typeorm';

/** Listens stored on the listener's last opt-out day, which the opt-out deleted. */
export type OptOutDayCarry = { storedCount: number; firstStoredAt: Date | null };

/**
 * Serializes every popularity write for one account until the transaction ends. Taken before any
 * row lock in that write, including the share lock on `account_settings`, so waiters do not hold
 * a row lock the holder still needs.
 */
export async function lockListenAccount(manager: EntityManager, accountId: number): Promise<void> {
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_listen_account:' || $1::text, 0))`,
    [accountId]
  );
}

const EMPTY_OPT_OUT_DAY_CARRY: OptOutDayCarry = { storedCount: 0, firstStoredAt: null };

/**
 * Services in this directory are the only code that reads `stats_listener`. This class is not
 * exported from `@podverse/orm`. Services here that the index exports take an `account_id` and
 * never return a listener id. See docs/features/POPULARITY-AND-TASTE-PROFILE.md.
 */
export class StatsListenerService {
  async getOrCreateListenerId(account_id: number, manager?: EntityManager): Promise<string> {
    const db = this.entityManager(manager);
    // Concurrent first writes of one account insert the same unique key. Postgres can deadlock
    // those inserts. The same lock is taken before the settings share lock; taking it again here
    // covers a caller that creates the listener without that read.
    await lockListenAccount(db, account_id);
    const result = await db
      .createQueryBuilder()
      .insert()
      .into(StatsListener)
      .values({ account_id })
      .orUpdate(['account_id'], ['account_id'])
      .returning(['listener_id'])
      .execute();

    return listenerIdFromInsertRaw(result.raw);
  }

  async findListenerId(account_id: number, manager?: EntityManager): Promise<string | null> {
    const row = await this.entityManager(manager).findOne(StatsListener, {
      where: { account_id },
      select: { listener_id: true },
    });
    return row === null ? null : row.listener_id;
  }

  /**
   * The carry for `day` (`YYYY-MM-DD`). A carry from an earlier day is cleared and reads as empty,
   * so a count is kept no longer than its own day plus the next report. The caller holds the
   * listener lock.
   */
  async readOptOutDayCarry(
    listenerId: string,
    day: string,
    manager: EntityManager
  ): Promise<OptOutDayCarry> {
    const row = await manager.findOne(StatsListener, {
      where: { listener_id: listenerId },
      select: {
        listener_id: true,
        opt_out_day: true,
        opt_out_day_stored_count: true,
        opt_out_day_first_stored_at: true,
      },
    });
    if (row === null || row.opt_out_day === null) {
      return { ...EMPTY_OPT_OUT_DAY_CARRY };
    }
    if (row.opt_out_day !== day) {
      await this.writeOptOutDayCarry(listenerId, null, manager);
      return { ...EMPTY_OPT_OUT_DAY_CARRY };
    }
    return {
      storedCount: row.opt_out_day_stored_count,
      firstStoredAt: row.opt_out_day_first_stored_at,
    };
  }

  /** Replaces the listener's carry; `null` empties it. The caller holds the listener lock. */
  async writeOptOutDayCarry(
    listenerId: string,
    carry: (OptOutDayCarry & { day: string }) | null,
    manager: EntityManager
  ): Promise<void> {
    await manager.update(
      StatsListener,
      { listener_id: listenerId },
      {
        opt_out_day: carry?.day ?? null,
        opt_out_day_stored_count: carry?.storedCount ?? 0,
        opt_out_day_first_stored_at: carry?.firstStoredAt ?? null,
      }
    );
  }

  private entityManager(manager?: EntityManager): EntityManager {
    return manager ?? AppDataSourceReadWrite.manager;
  }
}

function listenerIdFromInsertRaw(raw: unknown): string {
  if (!Array.isArray(raw)) {
    throw new Error('stats listener: insert returned no listener id');
  }

  const row: unknown = raw[0];
  if (!isListenerIdRow(row)) {
    throw new Error('stats listener: insert returned no listener id');
  }
  return row.listener_id;
}

function isListenerIdRow(value: unknown): value is { listener_id: string } {
  if (typeof value !== 'object' || value === null || !('listener_id' in value)) {
    return false;
  }
  return typeof value.listener_id === 'string';
}
