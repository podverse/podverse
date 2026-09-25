import NetInfo from '@react-native-community/netinfo';

import type { DTOItem } from '@podverse/helpers/dto';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { addByRssRepository } from '../data/repositories/addByRssRepository';
import { autoDownloadRepository } from '../data/repositories/autoDownloadRepository';
import { channelItemsRepository } from '../data/repositories/channelItemsRepository';
import { readAutoDownloadCatchUpLimit } from '../prefs/downloadPrefs';
import { isOfflineModeEnabled } from '../prefs/offlineMode';
import type { AutoDownloadChannelSettings, AutoDownloadPlanMode } from './autoDownloadPlanner';
import { autoDownloadNetworkFromNetInfoType, planAutoDownloads } from './autoDownloadPlanner';
import { downloadManager } from './downloadManager';

/**
 * Run one auto-download evaluate pass: load enabled channels, gather recent items (and optional
 * push ids), plan, persist ledger, enqueue through downloadManager.
 */

export type AutoDownloadEvaluateOptions = {
  /** When false, pending actions stay pending (membership gate). Default true. */
  membershipAllows?: boolean;
  /**
   * `catch_up` applies the global newest-N limit. `incremental` does not.
   * `retry_pending` only retries rows already waiting on Wi‑Fi.
   */
  mode?: AutoDownloadPlanMode;
  pushItemIdTexts?: ReadonlySet<string>;
  /** Limit channel-item scan to these channels (silent push or one refreshed channel). */
  channelIdTexts?: readonly string[];
};

/**
 * Build a downloadable DTOItem-shaped object from an add-by-RSS mapped item. The id_text is the
 * feed-scoped guid so the downloads index stays unique across feeds.
 */
const mappedAddByRssItemToDto = (
  feedUrl: string,
  itemBundle: AddByRSSMappedFeed['items'][number],
  index: number
): DTOItem | null => {
  const guid = itemBundle.item.guid ?? itemBundle.item.guid_enclosure_url ?? String(index);
  const idText = `${feedUrl}::${guid}`;
  const enclosures = itemBundle.enclosures ?? [];
  if (enclosures.length === 0) {
    return null;
  }

  const pubDate =
    itemBundle.item.pub_date instanceof Date
      ? itemBundle.item.pub_date.toISOString()
      : itemBundle.item.pub_date !== null && itemBundle.item.pub_date !== undefined
        ? String(itemBundle.item.pub_date)
        : null;

  return {
    id_text: idText,
    pub_date: pubDate,
    title: itemBundle.item.title ?? null,
    live_item: null,
    channel: { id_text: feedUrl },
    item_enclosures: enclosures.map((enclosure) => ({
      type: enclosure.item_enclosure?.type ?? null,
      item_enclosure_sources: (enclosure.item_enclosure_sources ?? []).map((source) => ({
        uri: source.uri,
      })),
    })),
  } as DTOItem;
};

const loadItemsForChannels = async (channelIdTexts: readonly string[]): Promise<DTOItem[]> => {
  const byId = new Map<string, DTOItem>();

  for (const channelIdText of channelIdTexts) {
    const settings = await autoDownloadRepository.getByChannelIdText(channelIdText);
    if (settings?.source === 'add_by_rss') {
      const mapped = await addByRssRepository.getMappedFeedByUrl(channelIdText);
      if (mapped === null) {
        continue;
      }
      mapped.items.forEach((itemBundle, index) => {
        const dto = mappedAddByRssItemToDto(channelIdText, itemBundle, index);
        if (dto !== null) {
          byId.set(dto.id_text, dto);
        }
      });
      continue;
    }

    const page = await channelItemsRepository.listByChannel(channelIdText, { sort: 'recent' });
    const newest = page.slice(0, 50);
    for (const item of newest) {
      byId.set(item.id_text, item);
    }
  }

  return [...byId.values()];
};

export const runAutoDownloadEvaluate = async (
  options: AutoDownloadEvaluateOptions = {}
): Promise<{ enqueued: number; pending: number; skipped: number }> => {
  const membershipAllows = options.membershipAllows !== false;
  const offline = isOfflineModeEnabled();
  const transfersAllowed = membershipAllows && !offline;

  const enabled = await autoDownloadRepository.listEnabled();
  const filterChannels = options.channelIdTexts;
  const channels = filterChannels
    ? enabled.filter((row) => filterChannels.includes(row.channelIdText))
    : enabled;

  if (channels.length === 0) {
    return { enqueued: 0, pending: 0, skipped: 0 };
  }

  const channelsByIdText = new Map<string, AutoDownloadChannelSettings>();
  for (const row of channels) {
    channelsByIdText.set(row.channelIdText, {
      allowCellular: row.allowCellular,
      channelIdText: row.channelIdText,
      enabled: row.enabled,
      enabledAtMs: row.enabledAtMs ?? 0,
    });
  }

  const pushIds = options.pushItemIdTexts ?? new Set<string>();
  const items = await loadItemsForChannels(channels.map((row) => row.channelIdText));

  const existingStatuses = await autoDownloadRepository.getCandidateStatuses(
    items.map((item) => item.id_text)
  );

  const netState = await NetInfo.fetch();
  const network = autoDownloadNetworkFromNetInfoType(netState.type, netState.isConnected);

  const mode = options.mode ?? 'incremental';
  const catchUpLimit = mode === 'catch_up' ? await readAutoDownloadCatchUpLimit() : undefined;

  const actions = planAutoDownloads({
    channelsByIdText,
    ...(catchUpLimit !== undefined ? { catchUpLimit } : {}),
    existingStatuses,
    items,
    mode,
    network,
    pushItemIdTexts: pushIds,
    transfersAllowed,
  });

  let enqueued = 0;
  let pending = 0;
  let skipped = 0;

  for (const action of actions) {
    if (action.kind === 'skip_already_decided' || action.kind === 'skip_before_watermark') {
      skipped += 1;
      continue;
    }

    if (action.kind === 'skip_over_cap') {
      await autoDownloadRepository.setCandidateStatus({
        channelIdText: action.channelIdText,
        itemIdText: action.itemIdText,
        status: 'skipped_over_cap',
      });
      skipped += 1;
      continue;
    }

    if (action.kind === 'skip_ineligible') {
      await autoDownloadRepository.setCandidateStatus({
        channelIdText: action.channelIdText,
        itemIdText: action.itemIdText,
        status: 'skipped_ineligible',
      });
      skipped += 1;
      continue;
    }

    if (action.kind === 'pending_network') {
      await autoDownloadRepository.setCandidateStatus({
        channelIdText: action.channelIdText,
        itemIdText: action.itemIdText,
        status: 'pending',
      });
      pending += 1;
      continue;
    }

    const item = items.find((candidate) => candidate.id_text === action.itemIdText);
    if (item === undefined) {
      skipped += 1;
      continue;
    }

    const result = await downloadManager.enqueue(item);
    if (result.ok) {
      await autoDownloadRepository.setCandidateStatus({
        channelIdText: action.channelIdText,
        itemIdText: action.itemIdText,
        status: 'enqueued',
      });
      enqueued += 1;
    } else {
      await autoDownloadRepository.setCandidateStatus({
        channelIdText: action.channelIdText,
        itemIdText: action.itemIdText,
        status: 'skipped_ineligible',
      });
      skipped += 1;
    }
  }

  return { enqueued, pending, skipped };
};
