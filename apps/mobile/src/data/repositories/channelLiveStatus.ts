import { ONE_HOUR_MS } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import type { SubscriptionKind } from './types';

/**
 * The rules behind the live badge: how long a stored status may be believed, and how to read one
 * out of a channel's live items or a stored add-by-RSS bundle.
 *
 * Free of `expo-sqlite` and React Native so the judgement calls are unit-testable in node —
 * `channelLiveStatusRepository` owns the storage and the requests.
 */

/**
 * How long a recorded status is trusted.
 *
 * A broadcast ends whether or not this device is online to hear about it, so an old row is not
 * evidence of anything. Without this bound a phone left in a pocket over the weekend would open on
 * Monday still insisting three shows are live. An hour comfortably outlasts the gap between
 * foreground syncs while being far shorter than the mistake it prevents.
 */
export const LIVE_STATUS_MAX_AGE_MS = ONE_HOUR_MS;

export type ChannelLiveStatusEntry = {
  subscriptionKey: string;
  kind: SubscriptionKind;
  statusId: LiveItemStatusEnum;
};

export type StoredLiveStatus = ChannelLiveStatusEntry & {
  updatedAtMs: number;
};

/**
 * Whether a stored status still means the subscription is broadcasting right now.
 *
 * Both halves matter: a `pending` row is a scheduled show rather than a live one, and a `live` row
 * older than the trust window is a broadcast this device simply has not heard the end of.
 */
export const isBroadcastingNow = (
  status: Pick<StoredLiveStatus, 'statusId' | 'updatedAtMs'>,
  nowMs: number = Date.now()
): boolean => {
  return (
    status.statusId === LiveItemStatusEnum.Live &&
    nowMs - status.updatedAtMs < LIVE_STATUS_MAX_AGE_MS
  );
};

/** The subscription keys to badge as live, from whatever is stored. */
export const selectBroadcastingKeys = (
  stored: readonly StoredLiveStatus[],
  nowMs: number = Date.now()
): Set<string> => {
  const keys = new Set<string>();
  for (const status of stored) {
    if (isBroadcastingNow(status, nowMs)) {
      keys.add(status.subscriptionKey);
    }
  }
  return keys;
};

/**
 * The two fields a live item is read for. Narrower than `DTOItem`, which satisfies it structurally —
 * so the rules stay legible and a fixture is two fields rather than a whole episode.
 */
export type LiveItemStatusSource = {
  channel?: { id_text: string } | null;
  live_item?: { live_item_status_id: LiveItemStatusEnum } | null;
};

/**
 * Turn the subscribed live-item response into one status per channel.
 *
 * A channel can be running more than one live item, and the strongest state wins: a show that is
 * on the air now is on the air, whatever else it has scheduled. Items with no channel or no live
 * block are dropped rather than guessed at.
 */
export const toChannelLiveStatuses = (
  items: readonly LiveItemStatusSource[]
): Map<string, ChannelLiveStatusEntry> => {
  const byChannel = new Map<string, ChannelLiveStatusEntry>();

  for (const item of items) {
    const subscriptionKey = item.channel?.id_text.trim();
    const statusId = item.live_item?.live_item_status_id;
    if (
      subscriptionKey === undefined ||
      subscriptionKey.length === 0 ||
      statusId === undefined ||
      statusId === null
    ) {
      continue;
    }

    const existing = byChannel.get(subscriptionKey);
    if (existing === undefined || isStrongerLiveStatus(statusId, existing.statusId)) {
      byChannel.set(subscriptionKey, { kind: 'channel', statusId, subscriptionKey });
    }
  }

  return byChannel;
};

/**
 * An add-by-RSS bundle's live items as the stored JSON actually holds them.
 *
 * The parser's type says these are `Date`s, which stops being true the moment the bundle goes
 * through `JSON.stringify` into SQLite. The status is the only field a badge needs.
 */
export type StoredAddByRssLiveBundle = {
  liveItems?: ({ liveItem?: { live_item_status?: number | null } | null } | null)[] | null;
};

/**
 * The strongest live status a stored add-by-RSS feed declares, or `null` when it declares none.
 *
 * These feeds are stored whole, so this needs no network — but it is only as current as the last
 * parse, which is what the trust window on the stored row accounts for.
 */
export const readAddByRssLiveStatus = (
  bundle: StoredAddByRssLiveBundle | null
): LiveItemStatusEnum | null => {
  let strongest: LiveItemStatusEnum | null = null;

  for (const entry of bundle?.liveItems ?? []) {
    const statusId = entry?.liveItem?.live_item_status;
    if (statusId === null || statusId === undefined || !isLiveItemStatus(statusId)) {
      continue;
    }
    if (strongest === null || isStrongerLiveStatus(statusId, strongest)) {
      strongest = statusId;
    }
  }

  return strongest;
};

/** Live outranks scheduled, which outranks ended. */
const LIVE_STATUS_RANK: Record<LiveItemStatusEnum, number> = {
  [LiveItemStatusEnum.Ended]: 0,
  [LiveItemStatusEnum.Pending]: 1,
  [LiveItemStatusEnum.Live]: 2,
};

const isStrongerLiveStatus = (
  candidate: LiveItemStatusEnum,
  incumbent: LiveItemStatusEnum
): boolean => {
  return LIVE_STATUS_RANK[candidate] > LIVE_STATUS_RANK[incumbent];
};

const isLiveItemStatus = (value: number): value is LiveItemStatusEnum => {
  return (
    value === LiveItemStatusEnum.Pending ||
    value === LiveItemStatusEnum.Live ||
    value === LiveItemStatusEnum.Ended
  );
};
