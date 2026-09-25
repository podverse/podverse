import type { DTOItem } from '@podverse/helpers/dto';

import type { DownloadEligibility } from './downloadEligibility';
import { isItemDownloadable } from './downloadEligibility';

/**
 * Pure auto-download planning. Decides what to do with candidate items given channel settings and
 * the current network — no I/O, so the decision stays unit-testable in node.
 */

export type AutoDownloadCandidateStatus =
  | 'pending'
  | 'enqueued'
  | 'skipped_ineligible'
  | 'skipped_over_cap'
  | 'user_removed';

/** How many newest episodes one catch-up may keep, across every opted-in podcast. */
export const DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT = 20;

export const AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS = [10, 20, 50] as const;

export type AutoDownloadCatchUpLimit = (typeof AUTO_DOWNLOAD_CATCH_UP_LIMIT_PRESETS)[number];

export type AutoDownloadPlanMode = 'catch_up' | 'incremental' | 'retry_pending';

export type AutoDownloadNetworkKind = 'wifi' | 'cellular' | 'none' | 'unknown';

export type AutoDownloadChannelSettings = {
  allowCellular: boolean;
  channelIdText: string;
  /** Epoch ms watermark; items at or before this are ignored (no backfill). */
  enabledAtMs: number;
  enabled: boolean;
};

export type AutoDownloadPlanAction =
  | { kind: 'enqueue'; itemIdText: string; channelIdText: string }
  | { kind: 'pending_network'; itemIdText: string; channelIdText: string }
  | { kind: 'skip_ineligible'; itemIdText: string; channelIdText: string; reason: string }
  | { kind: 'skip_already_decided'; itemIdText: string }
  | { kind: 'skip_before_watermark'; itemIdText: string }
  | { kind: 'skip_over_cap'; itemIdText: string; channelIdText: string };

export type PlanAutoDownloadsInput = {
  channelsByIdText: ReadonlyMap<string, AutoDownloadChannelSettings>;
  /**
   * Newest episodes kept on a catch-up, across every channel. Ignored for incremental and
   * pending retries.
   */
  catchUpLimit?: number;
  /** Existing ledger statuses keyed by item id_text. */
  existingStatuses: ReadonlyMap<string, AutoDownloadCandidateStatus>;
  items: readonly DTOItem[];
  /**
   * `catch_up` keeps the newest `catchUpLimit` eligible episodes and permanently skips the rest.
   * `incremental` enqueues eligible episodes with no cap (a push names only those ids).
   * `retry_pending` only retries rows already waiting on the network.
   */
  mode?: AutoDownloadPlanMode;
  network: AutoDownloadNetworkKind;
  /** When false, every enqueue becomes pending (membership / offline mode) and the cap does not skip. */
  transfersAllowed: boolean;
  /**
   * Explicit new-item ids from a silent push. Those bypass the pub_date watermark when the
   * channel is enabled. In incremental mode they are the only items considered.
   */
  pushItemIdTexts?: ReadonlySet<string>;
};

const itemPubDateMs = (item: DTOItem): number | null => {
  if (item.pub_date === null || item.pub_date === undefined || item.pub_date === '') {
    return null;
  }
  const parsed = Date.parse(item.pub_date);
  return Number.isFinite(parsed) ? parsed : null;
};

const networkAllowsDownload = (
  network: AutoDownloadNetworkKind,
  allowCellular: boolean
): boolean => {
  if (network === 'none') {
    return false;
  }
  if (network === 'wifi' || network === 'unknown') {
    return true;
  }
  if (network === 'cellular') {
    return allowCellular;
  }
  return false;
};

const ALREADY_DECIDED: ReadonlySet<AutoDownloadCandidateStatus> = new Set([
  'enqueued',
  'skipped_ineligible',
  'skipped_over_cap',
  'user_removed',
]);

const pubMsForAction = (
  action: AutoDownloadPlanAction,
  itemsById: ReadonlyMap<string, DTOItem>
): number => {
  if (!('itemIdText' in action)) {
    return Number.NEGATIVE_INFINITY;
  }
  const item = itemsById.get(action.itemIdText);
  if (item === undefined) {
    return Number.NEGATIVE_INFINITY;
  }
  return itemPubDateMs(item) ?? Number.NEGATIVE_INFINITY;
};

const applyCatchUpLimit = (
  actions: AutoDownloadPlanAction[],
  itemsById: ReadonlyMap<string, DTOItem>,
  limit: number
): AutoDownloadPlanAction[] => {
  const eligibleIndexes: number[] = [];
  actions.forEach((action, index) => {
    if (action.kind === 'enqueue' || action.kind === 'pending_network') {
      eligibleIndexes.push(index);
    }
  });

  eligibleIndexes.sort((leftIndex, rightIndex) => {
    const left = actions[leftIndex];
    const right = actions[rightIndex];
    const leftMs = left === undefined ? Number.NEGATIVE_INFINITY : pubMsForAction(left, itemsById);
    const rightMs =
      right === undefined ? Number.NEGATIVE_INFINITY : pubMsForAction(right, itemsById);
    return rightMs - leftMs;
  });

  const overCap = new Set(eligibleIndexes.slice(Math.max(0, limit)));
  return actions.map((action, index) => {
    if (!overCap.has(index)) {
      return action;
    }
    if (action.kind !== 'enqueue' && action.kind !== 'pending_network') {
      return action;
    }
    return {
      kind: 'skip_over_cap',
      itemIdText: action.itemIdText,
      channelIdText: action.channelIdText,
    };
  });
};

/**
 * Plan one pass of auto-download decisions. Callers persist ledger updates and enqueue through
 * `downloadManager` for `enqueue` actions only.
 */
export const planAutoDownloads = (input: PlanAutoDownloadsInput): AutoDownloadPlanAction[] => {
  const mode = input.mode ?? 'incremental';
  const pushIds = input.pushItemIdTexts ?? new Set<string>();
  const scopedItems =
    mode === 'incremental' && pushIds.size > 0
      ? input.items.filter((item) => pushIds.has(item.id_text))
      : mode === 'retry_pending'
        ? input.items.filter((item) => input.existingStatuses.get(item.id_text) === 'pending')
        : input.items;

  const actions: AutoDownloadPlanAction[] = [];

  for (const item of scopedItems) {
    const itemIdText = item.id_text;
    const existing = input.existingStatuses.get(itemIdText);
    if (existing !== undefined && ALREADY_DECIDED.has(existing)) {
      actions.push({ kind: 'skip_already_decided', itemIdText });
      continue;
    }

    const channelIdText = item.channel?.id_text ?? null;
    if (channelIdText === null || channelIdText === '') {
      actions.push({
        kind: 'skip_ineligible',
        itemIdText,
        channelIdText: '',
        reason: 'no_channel',
      });
      continue;
    }

    const channel = input.channelsByIdText.get(channelIdText);
    if (channel === undefined || !channel.enabled) {
      continue;
    }

    const fromPush = pushIds.has(itemIdText);
    if (!fromPush) {
      const pubMs = itemPubDateMs(item);
      if (pubMs === null || pubMs <= channel.enabledAtMs) {
        actions.push({ kind: 'skip_before_watermark', itemIdText });
        continue;
      }
    }

    if (!input.transfersAllowed) {
      actions.push({
        kind: 'pending_network',
        itemIdText,
        channelIdText,
      });
      continue;
    }

    const eligibility: DownloadEligibility = isItemDownloadable(item);
    if (!eligibility.ok) {
      actions.push({
        kind: 'skip_ineligible',
        itemIdText,
        channelIdText,
        reason: eligibility.reason,
      });
      continue;
    }

    if (!networkAllowsDownload(input.network, channel.allowCellular)) {
      actions.push({ kind: 'pending_network', itemIdText, channelIdText });
      continue;
    }

    actions.push({ kind: 'enqueue', itemIdText, channelIdText });
  }

  if (mode !== 'catch_up' || !input.transfersAllowed) {
    return actions;
  }

  const itemsById = new Map(scopedItems.map((item) => [item.id_text, item]));
  const limit = input.catchUpLimit ?? DEFAULT_AUTO_DOWNLOAD_CATCH_UP_LIMIT;
  return applyCatchUpLimit(actions, itemsById, limit);
};

/** Map NetInfo-style type strings into the planner's network kind. */
export const autoDownloadNetworkFromNetInfoType = (
  type: string | null | undefined,
  isConnected: boolean | null | undefined
): AutoDownloadNetworkKind => {
  if (isConnected === false) {
    return 'none';
  }
  if (type === 'wifi' || type === 'ethernet') {
    return 'wifi';
  }
  if (type === 'cellular') {
    return 'cellular';
  }
  if (type === null || type === undefined || type === 'unknown' || type === 'none') {
    return type === 'none' ? 'none' : 'unknown';
  }
  return 'unknown';
};
