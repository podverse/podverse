import { getPodcastIndexConfig, getStatsConfig } from '@workers/config/index.js';
import { getIndexProvider } from '@workers/factories/indexProvider.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

import {
  deadFeedPairsWeHold,
  extractDeadFeedCsvRow,
  podcastIndexIdsToRetire,
  resolveDeadFeedDuplicateChains,
  RETIRE_MAX_PER_RUN,
  retireGrowthExceedsBrake,
} from '@podverse/external-services-podcast-index';
import {
  ChannelMergeService,
  ChannelMergeStatus,
  FeedLifecycleStateKeyEnum,
  FeedLifecycleUpdateSourceEnum,
  FeedService,
  lifecycleStateBlocksParseAndVisibility,
  PODCAST_INDEX_DEAD_FEED_SYNC_ID,
  PodcastIndexDeadFeedSync,
  PodcastIndexDeadFeedSyncService,
  verifyAndApplyDuplicateMerges,
} from '@podverse/orm';

import { enqueueRepointParse, fetchSurvivorFeed } from './applyDuplicateMerges.js';
import { applyRemoteStubMerges } from './remoteStubMerges.js';

const PODCAST_INDEX_DEAD_REASON_KEY = 'podcast_index_dead';
const CHANNELLESS_FEED_DELETE_MAX_PER_RUN = 200;

const MERGE_STATUSES_THAT_WAIT: ReadonlySet<ChannelMergeStatus> = new Set([
  ChannelMergeStatus.Detected,
  ChannelMergeStatus.Verified,
  ChannelMergeStatus.NeedsReview,
  ChannelMergeStatus.Applied,
]);

/**
 * Record Podcast Index duplicate pairs for feeds we already store, then assess them.
 * The same merge mode runs the remote stub pass on a modified download: stubs whose feed was
 * merged are re-pointed to the survivor, and stubs whose feed is retired, or whose survivor we
 * parse, are removed.
 * When retire mode is `dry_run` or `apply`, also download the full dead list and retire
 * feeds that list marks, up to 200 per apply run.
 * Both modes `off` returns before any download.
 */
export const podcastIndexDeadFeedsFlagAndMerge = async () => {
  const { duplicateMergeMode, deadFeedRetireMode } = getPodcastIndexConfig();
  if (duplicateMergeMode === 'off' && deadFeedRetireMode === 'off') {
    console.warn(
      'PODCAST_INDEX_DUPLICATE_MERGE_MODE and PODCAST_INDEX_DEAD_FEED_RETIRE_MODE are off. Skipping dead-feed download.'
    );
    return;
  }

  const syncService = new PodcastIndexDeadFeedSyncService();
  const existing = await syncService.get();
  const previousEligibleCount = existing?.last_retire_eligible_count ?? null;
  const targets = new Map<number, number | null>();
  let rowCount = 0;

  const download = await getPodcastIndexService().deadFeedsDownloadAndExtractCSV(
    (row) => {
      rowCount += 1;
      const parsed = extractDeadFeedCsvRow(row);
      if (parsed === null) {
        return;
      }
      targets.set(parsed.id_to_archive, parsed.duplicate_id_to_keep);
      if (rowCount % 500000 === 0) {
        console.warn(`Dead-feed CSV: read ${rowCount} rows.`);
      }
    },
    deadFeedRetireMode === 'off'
      ? {
          ifModifiedSince: existing?.last_modified,
          ifNoneMatch: existing?.etag,
        }
      : undefined
  );

  let syncRow: PodcastIndexDeadFeedSync | null = null;
  if (download.notModified) {
    console.warn('Dead-feed CSV was not modified.');
  } else {
    let pairsRecorded = 0;
    if (duplicateMergeMode !== 'off') {
      const held = new Set(await new FeedService().listPodcastIndexIds());
      const pairs = deadFeedPairsWeHold(resolveDeadFeedDuplicateChains(targets), held);
      const mergeService = new ChannelMergeService();
      for (const pair of pairs) {
        await mergeService.upsertDetected({
          fromPodcastIndexId: pair.fromPodcastIndexId,
          toPodcastIndexId: pair.toPodcastIndexId,
        });
      }
      try {
        await applyRemoteStubMerges({
          targets,
          heldPodcastIndexIds: held,
          mode: duplicateMergeMode,
          provider: getIndexProvider(),
          rateLimitDelayMs: getPodcastIndexConfig().rateLimitDelay ?? 0,
        });
      } catch (error) {
        console.error('Remote stub merge pass failed.', error);
      }
      pairsRecorded = pairs.length;
    }

    syncRow = syncRowFromDownload(existing, download.lastModified, download.etag);
    await syncService.save(syncRow);
    console.warn(
      duplicateMergeMode === 'off'
        ? `Dead-feed CSV: ${rowCount} rows downloaded (merge off, retire ${deadFeedRetireMode}).`
        : `Dead-feed CSV: ${rowCount} rows, ${pairsRecorded} pairs recorded for feeds we have (mode ${duplicateMergeMode}).`
    );
  }

  if (duplicateMergeMode !== 'off') {
    await verifyAndApplyDuplicateMerges({
      mode: duplicateMergeMode,
      fetchSurvivorFeed,
      enqueueRepointParse,
      statsTrackEventRetentionDays: getStatsConfig().trackEventRetentionDays,
    });
  }

  if (deadFeedRetireMode === 'off') {
    return;
  }
  if (download.notModified || syncRow === null) {
    console.warn('Dead-feed retire skipped because the CSV was not modified.');
    return;
  }
  if (rowCount === 0) {
    console.warn('Dead-feed retire skipped because the CSV had no rows.');
    return;
  }

  await retireDeadFeeds({
    targets,
    mode: deadFeedRetireMode,
    previousEligibleCount,
    syncRow,
    syncService,
  });
};

function syncRowFromDownload(
  existing: PodcastIndexDeadFeedSync | null,
  lastModified: string | null,
  etag: string | null
): PodcastIndexDeadFeedSync {
  const syncRow = new PodcastIndexDeadFeedSync();
  syncRow.id = PODCAST_INDEX_DEAD_FEED_SYNC_ID;
  syncRow.last_modified = lastModified;
  syncRow.etag = etag;
  syncRow.synced_at = new Date();
  syncRow.last_retire_eligible_count = existing?.last_retire_eligible_count ?? null;
  return syncRow;
}

async function retireDeadFeeds(params: {
  targets: ReadonlyMap<number, number | null>;
  mode: 'dry_run' | 'apply';
  previousEligibleCount: number | null;
  syncRow: PodcastIndexDeadFeedSync;
  syncService: PodcastIndexDeadFeedSyncService;
}): Promise<void> {
  const feedService = new FeedService();
  const heldIds = await feedService.listPodcastIndexIds();
  const held = new Set(heldIds);
  const eligibleIds = await eligiblePodcastIndexIds(params.targets, held);
  const eligibleCount = eligibleIds.length;
  const heldCount = heldIds.length;
  const brake = retireGrowthExceedsBrake({
    eligibleCount,
    previousEligibleCount: params.previousEligibleCount,
    heldCount,
  });
  const growth =
    params.previousEligibleCount === null ? null : eligibleCount - params.previousEligibleCount;

  const lifecycleById = await lifecycleByPodcastIndexId(feedService, eligibleIds);
  let notYetBlocking = 0;
  const toRetire: { feedId: number; podcastIndexId: number }[] = [];
  for (const podcastIndexId of eligibleIds) {
    const row = lifecycleById.get(podcastIndexId);
    const blocks =
      row?.stateKey !== null &&
      row?.stateKey !== undefined &&
      lifecycleStateBlocksParseAndVisibility(row.stateKey);
    if (blocks) {
      continue;
    }
    notYetBlocking += 1;
    if (row === undefined || toRetire.length >= RETIRE_MAX_PER_RUN) {
      continue;
    }
    toRetire.push({ feedId: row.feedId, podcastIndexId });
  }

  if (brake && params.mode === 'apply') {
    const reason =
      params.previousEligibleCount === null
        ? 'No baseline is stored yet'
        : 'Growth exceeds the brake';
    console.warn(
      `Dead-feed retire: eligible ${eligibleCount}, stored ${params.previousEligibleCount ?? 'none'}, ` +
        `held ${heldCount}. ${reason}, so this run retires nothing. One dry_run accepts the new count.`
    );
    return;
  }

  if (brake && params.previousEligibleCount !== null) {
    console.warn(
      `Dead-feed retire: eligible ${eligibleCount}, stored ${params.previousEligibleCount}, ` +
        `held ${heldCount}. Growth exceeds the brake. This dry_run stores the new count and retires nothing.`
    );
  }

  if (params.mode === 'dry_run') {
    console.warn(
      `Dead-feed retire dry_run: eligible ${eligibleCount}, growth ${growth ?? 'none'}, not yet blocking ${notYetBlocking}.`
    );
    await storeEligibleCount(params.syncService, params.syncRow, eligibleCount);
    await logOrDeleteChannellessFeeds(feedService, params.targets, 'dry_run');
    return;
  }

  let changed = 0;
  for (const feed of toRetire) {
    await feedService.setFeedLifecycleState(feed.feedId, {
      toStateKey: FeedLifecycleStateKeyEnum.PendingArchive,
      reasonKey: PODCAST_INDEX_DEAD_REASON_KEY,
      source: FeedLifecycleUpdateSourceEnum.System,
    });
    changed += 1;
  }
  await storeEligibleCount(params.syncService, params.syncRow, eligibleCount);
  console.warn(
    `Dead-feed retire apply: marked ${changed} feeds pending_archive (eligible ${eligibleCount}).`
  );
  await logOrDeleteChannellessFeeds(feedService, params.targets, 'apply');
}

/**
 * Held dead ids whose chain does not resolve, except merge rows still in progress,
 * plus held resolved sources whose merge was rejected or reverted.
 */
async function eligiblePodcastIndexIds(
  targets: ReadonlyMap<number, number | null>,
  held: ReadonlySet<number>
): Promise<number[]> {
  const unresolved = podcastIndexIdsToRetire(targets, held);
  const resolvedHeld = deadFeedPairsWeHold(resolveDeadFeedDuplicateChains(targets), held);
  const lookupIds = new Set<number>(unresolved);
  for (const pair of resolvedHeld) {
    lookupIds.add(pair.fromPodcastIndexId);
  }

  const merges = await new ChannelMergeService().listByFromPodcastIndexIds([...lookupIds]);
  const statusByFromId = new Map(merges.map((row) => [row.from_podcast_index_id, row.status]));

  const eligible = new Set<number>();
  for (const podcastIndexId of unresolved) {
    const status = statusByFromId.get(podcastIndexId);
    if (status !== undefined && MERGE_STATUSES_THAT_WAIT.has(status)) {
      continue;
    }
    eligible.add(podcastIndexId);
  }
  for (const pair of resolvedHeld) {
    const status = statusByFromId.get(pair.fromPodcastIndexId);
    if (status === ChannelMergeStatus.Rejected || status === ChannelMergeStatus.Reverted) {
      eligible.add(pair.fromPodcastIndexId);
    }
  }

  return [...eligible].sort((left, right) => left - right);
}

async function lifecycleByPodcastIndexId(
  feedService: FeedService,
  podcastIndexIds: readonly number[]
): Promise<Map<number, { feedId: number; stateKey: FeedLifecycleStateKeyEnum | null }>> {
  const rows = await feedService.listLifecycleByPodcastIndexIds(podcastIndexIds);
  const byId = new Map<number, { feedId: number; stateKey: FeedLifecycleStateKeyEnum | null }>();
  for (const row of rows) {
    byId.set(row.podcastIndexId, { feedId: row.feedId, stateKey: row.stateKey });
  }
  return byId;
}

async function storeEligibleCount(
  syncService: PodcastIndexDeadFeedSyncService,
  syncRow: PodcastIndexDeadFeedSync,
  eligibleCount: number
): Promise<void> {
  syncRow.last_retire_eligible_count = eligibleCount;
  await syncService.save(syncRow);
}

async function logOrDeleteChannellessFeeds(
  feedService: FeedService,
  targets: ReadonlyMap<number, number | null>,
  mode: 'dry_run' | 'apply'
): Promise<void> {
  const candidates = await feedService.listByLifecycleReasonWithoutChannel(
    PODCAST_INDEX_DEAD_REASON_KEY
  );
  const absent = candidates.filter((row) => !targets.has(row.podcastIndexId));
  const batch = absent.slice(0, CHANNELLESS_FEED_DELETE_MAX_PER_RUN);
  if (mode === 'dry_run') {
    console.warn(
      `Dead-feed retire dry_run: ${absent.length} feeds without a channel are absent from this CSV. Deleting none.`
    );
    return;
  }

  let deleted = 0;
  let blocked = 0;
  for (const row of batch) {
    const result = await feedService.deleteFeedWithoutChannel(row.id);
    if (result === 'deleted') {
      deleted += 1;
    } else if (result === 'blocked') {
      blocked += 1;
      console.warn(
        `Dead-feed retire: left feed ${row.id} (podcast index ${row.podcastIndexId}) in place. A foreign key blocked the delete.`
      );
    }
  }
  console.warn(
    `Dead-feed retire apply: deleted ${deleted} feeds without a channel absent from this CSV. ${blocked} blocked by a foreign key.`
  );
}
