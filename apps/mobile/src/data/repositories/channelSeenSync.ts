import { toEpochMsOrNull } from '@podverse/helpers';

import type { SubscriptionKind } from './types';

/**
 * The rules behind per-subscription seen state: which side of a sync is behind, and how to read
 * publish dates out of a stored add-by-RSS bundle.
 *
 * Free of `expo-sqlite` and React Native so the parts that are easy to get wrong — reconciling two
 * timestamps without ever moving one backward, and trusting dates from an arbitrary feed — are
 * unit-testable in node. `channelSeenRepository` owns the storage and the requests.
 */

export type SeenEntry = {
  subscriptionKey: string;
  kind: SubscriptionKind;
  lastSeenAtMs: number;
};

export type RemoteSeenState = {
  subscriptionKey: string;
  /** ISO timestamp from the account, or `null` when it has never been opened anywhere. */
  remoteLastSeenAt: string | null;
};

export type SeenReconcilePlan = {
  /** Server is ahead: adopt its timestamp locally. */
  adopt: SeenEntry[];
  /** Device is ahead: send its timestamp up. */
  push: SeenEntry[];
};

/**
 * Decide, per subscription, which side is behind.
 *
 * Whichever timestamp is later wins, so this settles after a single pass and can safely run on every
 * sync in either direction — a timestamp that only advances cannot lose information.
 *
 * Only subscriptions the account already knows about are considered, because that is all the server
 * answers with. A local-only follow keeps its badge on the device and is never pushed into an
 * account that did not ask for it.
 */
export const reconcileSeenState = (
  remote: readonly RemoteSeenState[],
  kind: SubscriptionKind,
  localByKey: ReadonlyMap<string, number>
): SeenReconcilePlan => {
  const adopt: SeenEntry[] = [];
  const push: SeenEntry[] = [];

  for (const { remoteLastSeenAt, subscriptionKey } of remote) {
    const remoteMs = toEpochMsOrNull(remoteLastSeenAt);
    const localMs = localByKey.get(subscriptionKey) ?? null;

    if (remoteMs !== null && (localMs === null || remoteMs > localMs)) {
      adopt.push({ kind, lastSeenAtMs: remoteMs, subscriptionKey });
    } else if (localMs !== null && (remoteMs === null || localMs > remoteMs)) {
      push.push({ kind, lastSeenAtMs: localMs, subscriptionKey });
    }
  }

  return { adopt, push };
};

/**
 * An add-by-RSS bundle as the stored JSON actually holds it.
 *
 * The parser's own type says `pub_date` is a `Date`, which is true in memory and false once the
 * bundle has been through `JSON.stringify` into SQLite. Reading it back as a string is the honest
 * shape, and this is the only field a count needs.
 */
export type StoredAddByRssBundle = {
  items?: ({ item?: { pub_date?: string | null } | null } | null)[] | null;
};

/**
 * Publish dates from a stored add-by-RSS bundle, in feed order.
 *
 * A missing or unparseable date becomes `null`, which counts as seen. A feed with sloppy dates
 * should under-report rather than permanently claim unseen episodes the user cannot clear.
 */
export const readAddByRssPubDatesMs = (bundle: StoredAddByRssBundle | null): (number | null)[] => {
  const items = bundle?.items;
  if (items === null || items === undefined) {
    return [];
  }

  return items.map((entry) => toEpochMsOrNull(entry?.item?.pub_date));
};
