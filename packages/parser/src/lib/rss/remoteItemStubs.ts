import { config } from '@parser/config/index.js';
import { getOptionalIndexProvider } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';
import { collectRemoteItemRefs } from '@parser/lib/rss/remoteItemRefs.js';

import type { IndexProvider, IndexProviderFeed } from '@podverse/helpers';
import { sleep } from '@podverse/helpers';
import type {
  Channel,
  Feed,
  RemoteChannelStub,
  RemoteItemStubRef,
  RemoteStubRefKeys,
} from '@podverse/orm';
import {
  ChannelService,
  FeedService,
  normalizeRemoteStubFeedGuid,
  normalizeRemoteStubFeedUrl,
  RemoteChannelStubService,
  RemoteItemStubService,
} from '@podverse/orm';

export const REMOTE_STUB_REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN = 100;

/** At least one of feedGuid / feedUrl is non-null. Raw values; services normalize. */
export type RemoteStubRef = {
  feedGuid: string | null;
  feedUrl: string | null;
  itemGuid: string | null;
};

export type ResolveRemoteStubsOptions = {
  /** Pause before every single-key provider call after the first in a run. */
  rateLimitDelayMs: number;
  /** Cap on single-key provider calls (URL fallbacks and item lookups) per run. */
  maxSingleLookups: number;
  /** A stub resolved more recently than this is reused without a provider call. 0 re-resolves every ref. */
  refreshAfterMs: number;
  /** Feed GUIDs never stubbed, such as the source feed's own GUID. */
  excludeFeedGuids?: readonly string[];
};

/**
 * - `parsed`: Podverse already has the feed; read paths use the parsed row.
 * - `stub`: a channel stub exists for the ref after this run.
 * - `not_found`: the provider does not know the feed. Nothing is remembered, so the next run asks
 *   again.
 * - `unavailable`: the lookup failed or the single-lookup cap was reached. An existing stale stub
 *   is returned as `stub` instead.
 * - `skipped`: no usable key, an excluded feed GUID, or a feed the provider reports dead.
 */
export type RemoteStubRefOutcome =
  | { status: 'parsed' }
  | { status: 'stub'; channelStub: RemoteChannelStub }
  | { status: 'not_found' }
  | { status: 'unavailable' }
  | { status: 'skipped' };

export type ResolveRemoteStubsResult = {
  /** Aligned with the input refs. */
  outcomes: RemoteStubRefOutcome[];
  channelStubsWritten: number;
  itemStubsWritten: number;
  lookupCapReached: boolean;
};

type FeedGroup = {
  /** Normalized GUID; null for a group keyed by URL only. */
  feedGuid: string | null;
  /** Distinct normalized URLs, in ref order. */
  urls: string[];
  /** Distinct trimmed item GUIDs, in ref order. */
  itemGuids: string[];
  refIndexes: number[];
  outcome: RemoteStubRefOutcome | null;
  staleStub: RemoteChannelStub | null;
  foundFeed: IndexProviderFeed | null;
};

type SingleLookupBudget = {
  readonly max: number;
  readonly delayMs: number;
  used: number;
  capReached: boolean;
};

/** Returns false (and records the cap) when no single-key call is left in this run. */
async function takeSingleLookup(budget: SingleLookupBudget): Promise<boolean> {
  if (budget.used >= budget.max) {
    budget.capReached = true;
    return false;
  }
  if (budget.used > 0) {
    await sleep(budget.delayMs);
  }
  budget.used += 1;
  return true;
}

function unavailableOrStale(group: FeedGroup): RemoteStubRefOutcome {
  return group.staleStub
    ? { status: 'stub', channelStub: group.staleStub }
    : { status: 'unavailable' };
}

function isFresh(stub: { resolved_at: Date }, refreshAfterMs: number, nowMs: number): boolean {
  const resolvedAtMs = new Date(stub.resolved_at).getTime();
  return Number.isFinite(resolvedAtMs) && nowMs - resolvedAtMs < refreshAfterMs;
}

function feedGuidsOf(groups: readonly FeedGroup[]): string[] {
  return groups.flatMap((group) => (group.feedGuid === null ? [] : [group.feedGuid]));
}

function pushDistinct(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function groupRefs(
  refs: readonly RemoteStubRef[],
  outcomes: (RemoteStubRefOutcome | null)[]
): FeedGroup[] {
  const groupsByKey = new Map<string, FeedGroup>();
  refs.forEach((ref, index) => {
    const feedGuid = normalizeRemoteStubFeedGuid(ref.feedGuid);
    const feedUrl = normalizeRemoteStubFeedUrl(ref.feedUrl);
    if (feedGuid === null && feedUrl === null) {
      outcomes[index] = { status: 'skipped' };
      return;
    }

    const key = feedGuid ?? `url:${feedUrl}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        feedGuid,
        urls: [],
        itemGuids: [],
        refIndexes: [],
        outcome: null,
        staleStub: null,
        foundFeed: null,
      };
      groupsByKey.set(key, group);
    }
    group.refIndexes.push(index);
    if (feedUrl !== null) {
      pushDistinct(group.urls, feedUrl);
    }
    const itemGuid = ref.itemGuid?.trim() ?? '';
    if (itemGuid.length > 0) {
      pushDistinct(group.itemGuids, itemGuid);
    }
  });
  return [...groupsByKey.values()];
}

async function markParsedGroups(groups: readonly FeedGroup[]): Promise<void> {
  const guidGroups = groups.filter((group) => group.outcome === null && group.feedGuid !== null);
  if (guidGroups.length > 0) {
    const channels = await new ChannelService().getAllByPodcastGuids(
      { select: { id: true, podcast_guid: true } },
      feedGuidsOf(guidGroups)
    );
    const parsedGuids = new Set(
      channels
        .map((channel) => channel.podcast_guid?.toLowerCase() ?? null)
        .filter((guid): guid is string => guid !== null)
    );
    for (const group of guidGroups) {
      if (group.feedGuid !== null && parsedGuids.has(group.feedGuid)) {
        group.outcome = { status: 'parsed' };
      }
    }
  }

  const feedService = new FeedService();
  for (const group of groups) {
    if (group.outcome !== null || group.feedGuid !== null) {
      continue;
    }
    for (const url of group.urls) {
      if (await feedService.getByUrl({ url })) {
        group.outcome = { status: 'parsed' };
        break;
      }
    }
  }
}

async function applyExistingStubs(
  groups: readonly FeedGroup[],
  refreshAfterMs: number
): Promise<void> {
  const pending = groups.filter((group) => group.outcome === null);
  if (pending.length === 0) {
    return;
  }
  const stubs = await new RemoteChannelStubService().getChannelStubsForRefs(
    pending.map((group) => ({ feedGuid: group.feedGuid, feedUrl: group.urls[0] ?? null }))
  );
  const nowMs = Date.now();
  pending.forEach((group, index) => {
    const stub = stubs[index] ?? null;
    if (stub === null) {
      return;
    }
    if (isFresh(stub, refreshAfterMs, nowMs)) {
      group.outcome = { status: 'stub', channelStub: stub };
    } else {
      group.staleStub = stub;
    }
  });
}

async function resolveGuidGroupsInBatch(
  provider: IndexProvider,
  groups: readonly FeedGroup[]
): Promise<void> {
  const guidGroups = groups.filter((group) => group.outcome === null && group.feedGuid !== null);
  if (guidGroups.length === 0) {
    return;
  }
  const lookup = await provider.resolveFeedsByGuid(feedGuidsOf(guidGroups));
  if (lookup.status !== 'found') {
    for (const group of guidGroups) {
      group.outcome = unavailableOrStale(group);
    }
    return;
  }
  for (const group of guidGroups) {
    const feed = group.feedGuid !== null ? lookup.value.get(group.feedGuid) : undefined;
    if (feed) {
      group.foundFeed = feed;
    }
  }
}

async function resolveGroupsByUrl(
  provider: IndexProvider,
  groups: readonly FeedGroup[],
  budget: SingleLookupBudget
): Promise<void> {
  for (const group of groups) {
    if (group.outcome !== null || group.foundFeed !== null) {
      continue;
    }
    if (group.urls.length === 0) {
      group.outcome = { status: 'not_found' };
      continue;
    }

    let sawUnavailable = false;
    let capped = false;
    for (const feedUrl of group.urls) {
      if (!(await takeSingleLookup(budget))) {
        capped = true;
        break;
      }
      const lookup = await provider.resolveFeed({ feedGuid: null, feedUrl });
      if (lookup.status === 'found') {
        group.foundFeed = lookup.value;
        break;
      }
      if (lookup.status === 'unavailable') {
        sawUnavailable = true;
      }
    }

    if (group.foundFeed === null) {
      group.outcome =
        capped || sawUnavailable ? unavailableOrStale(group) : { status: 'not_found' };
    }
  }
}

function refKeysForGroup(group: FeedGroup): RemoteStubRefKeys[] {
  if (group.urls.length === 0) {
    return [{ feedGuid: group.feedGuid, feedUrl: null }];
  }
  return group.urls.map((feedUrl) => ({ feedGuid: group.feedGuid, feedUrl }));
}

async function isParsedProviderFeed(feed: IndexProviderFeed): Promise<boolean> {
  if (feed.indexProvider !== 'podcast_index') {
    return false;
  }
  const podcastIndexId = Number(feed.providerFeedId);
  if (!Number.isSafeInteger(podcastIndexId)) {
    return false;
  }
  return (await new FeedService().getByPodcastIndexId(podcastIndexId)) !== null;
}

async function writeChannelStubs(groups: readonly FeedGroup[]): Promise<number> {
  const channelStubService = new RemoteChannelStubService();
  let written = 0;
  for (const group of groups) {
    const feed = group.foundFeed;
    if (group.outcome !== null || feed === null) {
      continue;
    }
    if (feed.isDead) {
      group.outcome = { status: 'skipped' };
      continue;
    }
    if (await isParsedProviderFeed(feed)) {
      group.outcome = { status: 'parsed' };
      continue;
    }
    const channelStub = await channelStubService.upsertChannelStub(feed, refKeysForGroup(group));
    group.outcome = { status: 'stub', channelStub };
    written += 1;
  }
  return written;
}

async function writeItemStubs(
  provider: IndexProvider,
  groups: readonly FeedGroup[],
  refreshAfterMs: number,
  budget: SingleLookupBudget
): Promise<number> {
  const targets: { channelStub: RemoteChannelStub; ref: RemoteItemStubRef }[] = [];
  for (const group of groups) {
    if (group.outcome?.status !== 'stub') {
      continue;
    }
    const { channelStub } = group.outcome;
    for (const itemGuid of group.itemGuids) {
      targets.push({
        channelStub,
        ref: { feedGuid: group.feedGuid, feedUrl: group.urls[0] ?? null, itemGuid },
      });
    }
  }
  if (targets.length === 0) {
    return 0;
  }

  const itemStubService = new RemoteItemStubService();
  const existing = await itemStubService.getItemStubsForRefs(targets.map((target) => target.ref));
  const nowMs = Date.now();
  let written = 0;
  for (const [index, { channelStub, ref }] of targets.entries()) {
    const itemStub = existing[index] ?? null;
    if (
      itemStub !== null &&
      itemStub.remote_channel_stub_id === channelStub.id &&
      isFresh(itemStub, refreshAfterMs, nowMs)
    ) {
      continue;
    }
    if (!(await takeSingleLookup(budget))) {
      continue;
    }
    const lookup = await provider.resolveItem({
      providerFeedId: channelStub.provider_feed_id,
      feedGuid: channelStub.feed_guid,
      itemGuid: ref.itemGuid,
    });
    if (lookup.status === 'found') {
      // Stored under the GUID the source feed references, so later reads by that GUID match.
      await itemStubService.upsertItemStub(channelStub, {
        ...lookup.value,
        itemGuid: ref.itemGuid,
      });
      written += 1;
    }
  }
  return written;
}

/**
 * Resolves remote item references through the index provider and writes channel and item stubs
 * for feeds the provider knows and Podverse has not parsed. Never parses a feed, queues work, or
 * touches parsed feed, channel, item, or image rows. Provider calls do not throw; ORM errors
 * propagate to the caller.
 */
export async function resolveRemoteStubsForRefs(
  provider: IndexProvider,
  refs: readonly RemoteStubRef[],
  options: ResolveRemoteStubsOptions
): Promise<ResolveRemoteStubsResult> {
  const outcomes: (RemoteStubRefOutcome | null)[] = refs.map(() => null);
  const budget: SingleLookupBudget = {
    max: options.maxSingleLookups,
    delayMs: options.rateLimitDelayMs,
    used: 0,
    capReached: false,
  };

  const groups = groupRefs(refs, outcomes);

  const excludedGuids = new Set(
    (options.excludeFeedGuids ?? [])
      .map((guid) => normalizeRemoteStubFeedGuid(guid))
      .filter((guid): guid is string => guid !== null)
  );
  for (const group of groups) {
    if (group.feedGuid !== null && excludedGuids.has(group.feedGuid)) {
      group.outcome = { status: 'skipped' };
    }
  }

  await markParsedGroups(groups);
  await applyExistingStubs(groups, options.refreshAfterMs);
  await resolveGuidGroupsInBatch(provider, groups);
  await resolveGroupsByUrl(provider, groups, budget);
  const channelStubsWritten = await writeChannelStubs(groups);
  const itemStubsWritten = await writeItemStubs(provider, groups, options.refreshAfterMs, budget);

  for (const group of groups) {
    const outcome: RemoteStubRefOutcome = group.outcome ?? { status: 'not_found' };
    for (const index of group.refIndexes) {
      outcomes[index] = outcome;
    }
  }

  return {
    outcomes: outcomes.map((outcome): RemoteStubRefOutcome => outcome ?? { status: 'skipped' }),
    channelStubsWritten,
    itemStubsWritten,
    lookupCapReached: budget.capReached,
  };
}

/** Writes stubs for the channel's remote item references. Never throws. */
export async function resolveRemoteItemStubsForChannel(channel: Channel): Promise<void> {
  try {
    const provider = getOptionalIndexProvider();
    if (provider === null) {
      return;
    }
    const latest = await new ChannelService().get(channel.id);
    if (!latest) {
      return;
    }
    const refs = await collectRemoteItemRefs(latest);
    if (refs.length === 0) {
      return;
    }

    const result = await resolveRemoteStubsForRefs(provider, refs, {
      rateLimitDelayMs: config.podcastIndex?.rateLimitDelay ?? 0,
      maxSingleLookups: REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN,
      refreshAfterMs: REMOTE_STUB_REFRESH_AFTER_MS,
      excludeFeedGuids: latest.podcast_guid ? [latest.podcast_guid] : [],
    });

    const statusCounts: Record<RemoteStubRefOutcome['status'], number> = {
      parsed: 0,
      stub: 0,
      not_found: 0,
      unavailable: 0,
      skipped: 0,
    };
    for (const outcome of result.outcomes) {
      statusCounts[outcome.status] += 1;
    }
    loggerService.info(
      `resolveRemoteItemStubsForChannel: channel_id=${latest.id} refs=${refs.length} ` +
        `parsed=${statusCounts.parsed} stub=${statusCounts.stub} not_found=${statusCounts.not_found} ` +
        `unavailable=${statusCounts.unavailable} skipped=${statusCounts.skipped} ` +
        `channel_stubs_written=${result.channelStubsWritten} item_stubs_written=${result.itemStubsWritten} ` +
        `lookup_cap_reached=${result.lookupCapReached}`
    );
  } catch (error) {
    loggerService.logError(
      'resolveRemoteItemStubsForChannel',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/** Deletes stubs for a feed that just finished a full parse. Never throws. */
export async function deleteRemoteStubsForParsedFeed(feed: Feed, channelId: number): Promise<void> {
  try {
    const latest = await new ChannelService().get(channelId);
    const deleted = await new RemoteChannelStubService().deleteForParsedFeed({
      podcastIndexId: feed.podcast_index_id,
      podcastGuid: latest?.podcast_guid ?? null,
      feedUrl: feed.url,
    });
    if (deleted > 0) {
      loggerService.info(
        `deleteRemoteStubsForParsedFeed: deleted ${deleted} remote channel stub(s) for feed_id=${feed.id} channel_id=${channelId}`
      );
    }
  } catch (error) {
    loggerService.logError(
      'deleteRemoteStubsForParsedFeed',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
