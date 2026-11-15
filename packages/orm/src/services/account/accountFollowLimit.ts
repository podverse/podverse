import type { EntityManager } from 'typeorm';

import type { FollowInsertDecision } from '@podverse/helpers';
import { decideFollowInsert, DEFAULT_MAX_FOLLOWS } from '@podverse/helpers';

/** Thrown when a new directory follow would pass the account's tier. */
export class FollowLimitReachedError extends Error {
  readonly limit: number;
  readonly code = 'follow_limit_reached' as const;
  readonly i18nKey = 'membership.follow_limit_reached' as const;

  constructor(limit: number) {
    super(`Follow limit reached (${limit})`);
    this.name = 'FollowLimitReachedError';
    this.limit = limit;
  }
}

export type FollowRoom = {
  storedLimit: number | null;
  followedCount: number;
};

function readStoredFollowLimit(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function readFollowedCount(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) {
    return 0;
  }
  const row = value[0];
  if (typeof row !== 'object' || row === null || !('total' in row)) {
    return 0;
  }
  const total = Reflect.get(row, 'total');
  if (typeof total === 'number' && Number.isInteger(total) && total >= 0) {
    return total;
  }
  if (typeof total === 'string' && /^\d+$/.test(total)) {
    return Number.parseInt(total, 10);
  }
  return 0;
}

function storedLimitFromRows(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  const row = rows[0];
  if (typeof row !== 'object' || row === null || !('max_follows' in row)) {
    return null;
  }
  return readStoredFollowLimit(Reflect.get(row, 'max_follows'));
}

/** Serializes follow inserts for one account. */
export async function lockAccountForFollow(
  manager: EntityManager,
  accountId: number
): Promise<void> {
  await manager.query(`SELECT id FROM account WHERE id = $1 FOR UPDATE`, [accountId]);
}

/** Channel, playlist, and account follows, counted together, plus the stored tier. */
export async function readFollowRoom(
  manager: EntityManager,
  accountId: number
): Promise<FollowRoom> {
  const storedRows = await manager.query(
    `SELECT max_follows FROM account_membership_status WHERE account_id = $1`,
    [accountId]
  );
  const countRows = await manager.query(
    `SELECT (
       (SELECT COUNT(*)::int FROM account_following_channel WHERE account_id = $1) +
       (SELECT COUNT(*)::int FROM account_following_playlist WHERE account_id = $1) +
       (SELECT COUNT(*)::int FROM account_following_account WHERE account_id = $1)
     ) AS total`,
    [accountId]
  );
  return {
    storedLimit: storedLimitFromRows(storedRows),
    followedCount: readFollowedCount(countRows),
  };
}

export function decideFollowRoom(room: FollowRoom, alreadyFollowed: boolean): FollowInsertDecision {
  return decideFollowInsert({
    alreadyFollowed,
    followedCount: room.followedCount,
    storedLimit: room.storedLimit,
    defaultLimit: DEFAULT_MAX_FOLLOWS,
  });
}

/** Locks the account and refuses when a new follow would pass the tier. An existing follow is not checked here. */
export async function assertNewFollowAllowed(
  manager: EntityManager,
  accountId: number
): Promise<void> {
  await lockAccountForFollow(manager, accountId);
  const decision = decideFollowRoom(await readFollowRoom(manager, accountId), false);
  if (decision.action === 'refuse') {
    throw new FollowLimitReachedError(decision.limit);
  }
}
