import type { IndexProvider, IndexProviderFeed } from '@podverse/helpers';
import { FeedService, RemoteChannelStubService } from '@podverse/orm';
import type { RemoteStubRef } from '@podverse/parser';
import { resolveRemoteStubsForRefs } from '@podverse/parser';

export const REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS = 25;

export type RemoteStubActionResult =
  | 'refreshed'
  | 'repointed'
  | 'deleted_parsed'
  | 'deleted_not_found'
  | 'deleted_retired'
  | 'target_not_found'
  | 'unavailable'
  | 'missing';

const assertUnreachable = (value: never): never => {
  throw new Error(`Unhandled index provider: ${String(value)}`);
};

async function isParsedByPodverse(feed: IndexProviderFeed): Promise<boolean> {
  switch (feed.indexProvider) {
    case 'podcast_index': {
      const podcastIndexId = Number(feed.providerFeedId);
      if (!Number.isSafeInteger(podcastIndexId) || podcastIndexId <= 0) {
        return false;
      }
      return (await new FeedService().getByPodcastIndexId(podcastIndexId)) !== null;
    }
    default:
      return assertUnreachable(feed.indexProvider);
  }
}

function buildRefsForRecheck(stub: {
  aliases: { key_kind: 'feed_guid' | 'feed_url'; key_value: string }[];
  item_stubs: { item_guid: string }[];
}): RemoteStubRef[] {
  const refs: RemoteStubRef[] = [];
  const firstFeedGuidAlias = stub.aliases.find((alias) => alias.key_kind === 'feed_guid') ?? null;
  const firstFeedUrlAlias = stub.aliases.find((alias) => alias.key_kind === 'feed_url') ?? null;

  for (const alias of stub.aliases) {
    if (alias.key_kind === 'feed_guid') {
      refs.push({ feedGuid: alias.key_value, feedUrl: null, itemGuid: null });
    } else {
      refs.push({ feedGuid: null, feedUrl: alias.key_value, itemGuid: null });
    }
  }

  for (const itemStub of stub.item_stubs) {
    if (firstFeedGuidAlias !== null) {
      refs.push({
        feedGuid: firstFeedGuidAlias.key_value,
        feedUrl: null,
        itemGuid: itemStub.item_guid,
      });
    } else if (firstFeedUrlAlias !== null) {
      refs.push({
        feedGuid: null,
        feedUrl: firstFeedUrlAlias.key_value,
        itemGuid: itemStub.item_guid,
      });
    }
  }

  return refs;
}

export async function recheckRemoteChannelStub(
  provider: IndexProvider,
  remoteChannelStubId: number,
  options: { rateLimitDelayMs: number }
): Promise<RemoteStubActionResult> {
  const remoteChannelStubService = new RemoteChannelStubService();
  const stub = await remoteChannelStubService.getByIdWithRelations(remoteChannelStubId);
  if (stub === null) {
    return 'missing';
  }

  let latestStub = stub;
  const refs = buildRefsForRecheck(stub);
  if (refs.length > 0) {
    const startedAt = new Date();
    const resolved = await resolveRemoteStubsForRefs(provider, refs, {
      rateLimitDelayMs: options.rateLimitDelayMs,
      maxSingleLookups: REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS,
      refreshAfterMs: 0,
    });

    const reloadedStub = await remoteChannelStubService.getByIdWithRelations(remoteChannelStubId);
    if (reloadedStub === null) {
      return 'repointed';
    }
    latestStub = reloadedStub;

    if (reloadedStub.resolved_at.getTime() >= startedAt.getTime()) {
      return 'refreshed';
    }
    if (resolved.outcomes.some((outcome) => outcome.status === 'unavailable')) {
      return 'unavailable';
    }
    if (resolved.outcomes.some((outcome) => outcome.status === 'stub')) {
      await remoteChannelStubService.deleteById(remoteChannelStubId);
      return 'repointed';
    }
    if (resolved.outcomes.some((outcome) => outcome.status === 'parsed')) {
      await remoteChannelStubService.deleteById(remoteChannelStubId);
      return 'deleted_parsed';
    }
  }

  const feedLookup = await provider.getFeedById(latestStub.provider_feed_id);
  if (feedLookup.status === 'unavailable') {
    return 'unavailable';
  }
  if (feedLookup.status === 'not_found') {
    await remoteChannelStubService.deleteById(remoteChannelStubId);
    return 'deleted_not_found';
  }
  if (feedLookup.value.isDead) {
    await remoteChannelStubService.deleteById(remoteChannelStubId);
    return 'deleted_retired';
  }
  if (await isParsedByPodverse(feedLookup.value)) {
    await remoteChannelStubService.deleteById(remoteChannelStubId);
    return 'deleted_parsed';
  }

  await remoteChannelStubService.upsertChannelStub(feedLookup.value, []);
  return 'refreshed';
}

export async function repointRemoteChannelStub(
  provider: IndexProvider,
  remoteChannelStubId: number,
  targetProviderFeedId: string
): Promise<RemoteStubActionResult> {
  const remoteChannelStubService = new RemoteChannelStubService();
  const stub = await remoteChannelStubService.getByIdWithRelations(remoteChannelStubId);
  if (stub === null) {
    return 'missing';
  }

  const feedLookup = await provider.getFeedById(targetProviderFeedId);
  if (feedLookup.status === 'unavailable') {
    return 'unavailable';
  }
  if (feedLookup.status === 'not_found' || feedLookup.value.isDead) {
    return 'target_not_found';
  }
  if (await isParsedByPodverse(feedLookup.value)) {
    await remoteChannelStubService.deleteById(stub.id);
    return 'deleted_parsed';
  }

  const repointedStub = await remoteChannelStubService.repointToFeed(stub.id, feedLookup.value);
  return repointedStub === null ? 'missing' : 'repointed';
}
