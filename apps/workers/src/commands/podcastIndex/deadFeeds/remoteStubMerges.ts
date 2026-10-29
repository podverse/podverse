import {
  deadFeedPairsWeHold,
  podcastIndexIdsToRetire,
  resolveDeadFeedDuplicateChains,
} from '@podverse/external-services-podcast-index';
import type { IndexProvider, IndexProviderId } from '@podverse/helpers';
import { sleep } from '@podverse/helpers';
import { RemoteChannelStubService } from '@podverse/orm';

export const REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN = 500;
export const REMOTE_STUB_MERGE_MAX_DELETES_PER_RUN = 1000;

const PODCAST_INDEX_PROVIDER: IndexProviderId = 'podcast_index';

export type RemoteStubMergePlan = {
  /** Stub provider id → live survivor provider id Podverse does not parse. */
  repoint: { fromPodcastIndexId: number; toPodcastIndexId: number }[];
  /** Stub provider ids whose survivor Podverse already parses. */
  deleteSurvivorParsed: number[];
  /** Stub provider ids the list retires with no live survivor. */
  deleteRetired: number[];
};

/** Decides, from the dead-feed list, what happens to each remote stub the list names. */
export function planRemoteStubMerges(params: {
  targets: ReadonlyMap<number, number | null>;
  stubPodcastIndexIds: ReadonlySet<number>;
  heldPodcastIndexIds: ReadonlySet<number>;
}): RemoteStubMergePlan {
  const pairs = deadFeedPairsWeHold(
    resolveDeadFeedDuplicateChains(params.targets),
    params.stubPodcastIndexIds
  );

  const repoint: RemoteStubMergePlan['repoint'] = [];
  const deleteSurvivorParsed: number[] = [];
  for (const pair of pairs) {
    if (params.heldPodcastIndexIds.has(pair.toPodcastIndexId)) {
      deleteSurvivorParsed.push(pair.fromPodcastIndexId);
    } else {
      repoint.push(pair);
    }
  }
  repoint.sort((left, right) => left.fromPodcastIndexId - right.fromPodcastIndexId);
  deleteSurvivorParsed.sort((left, right) => left - right);

  return {
    repoint,
    deleteSurvivorParsed,
    deleteRetired: podcastIndexIdsToRetire(params.targets, params.stubPodcastIndexIds),
  };
}

function toPodcastIndexId(providerFeedId: string): number | null {
  if (!/^[1-9]\d*$/.test(providerFeedId)) {
    return null;
  }
  const id = Number(providerFeedId);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * Re-points remote stubs whose Podcast Index feed was merged into a live survivor, and deletes
 * stubs whose feed is retired with no survivor or whose survivor Podverse already parses. A stub
 * is a placeholder: a deleted one is written again on the next parse of a source feed when the
 * provider still lists the feed.
 */
export async function applyRemoteStubMerges(params: {
  targets: ReadonlyMap<number, number | null>;
  heldPodcastIndexIds: ReadonlySet<number>;
  mode: 'dry_run' | 'apply';
  provider: IndexProvider;
  rateLimitDelayMs: number;
}): Promise<void> {
  const stubService = new RemoteChannelStubService();
  const stubPodcastIndexIds = new Set<number>();
  for (const providerFeedId of await stubService.listProviderFeedIds(PODCAST_INDEX_PROVIDER)) {
    const id = toPodcastIndexId(providerFeedId);
    if (id !== null) {
      stubPodcastIndexIds.add(id);
    }
  }
  if (stubPodcastIndexIds.size === 0) {
    return;
  }

  const plan = planRemoteStubMerges({
    targets: params.targets,
    stubPodcastIndexIds,
    heldPodcastIndexIds: params.heldPodcastIndexIds,
  });

  if (params.mode === 'dry_run') {
    console.warn(
      `Remote stub merge dry_run: ${plan.repoint.length} to re-point, ` +
        `${plan.deleteSurvivorParsed.length} to delete because Podverse parses the survivor, ` +
        `${plan.deleteRetired.length} to delete because the list retires them. Changing none.`
    );
    return;
  }

  const findStub = (podcastIndexId: number) =>
    stubService.getByProviderFeedId(PODCAST_INDEX_PROVIDER, String(podcastIndexId));

  const repointBatch = plan.repoint.slice(0, REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN);
  let lookups = 0;
  let repointed = 0;
  let deletedSurvivorGone = 0;
  let unavailable = 0;
  let failed = 0;
  for (const entry of repointBatch) {
    const stub = await findStub(entry.fromPodcastIndexId);
    if (stub === null) {
      continue;
    }
    if (lookups > 0) {
      await sleep(params.rateLimitDelayMs);
    }
    lookups += 1;

    try {
      const lookup = await params.provider.getFeedById(String(entry.toPodcastIndexId));
      if (lookup.status === 'unavailable') {
        unavailable += 1;
      } else if (lookup.status === 'found' && !lookup.value.isDead) {
        await stubService.repointToFeed(stub.id, lookup.value);
        repointed += 1;
      } else if (await stubService.deleteById(stub.id)) {
        deletedSurvivorGone += 1;
      }
    } catch (error) {
      failed += 1;
      console.error('Remote stub re-point failed.', {
        fromPodcastIndexId: entry.fromPodcastIndexId,
        toPodcastIndexId: entry.toPodcastIndexId,
        error,
      });
    }
  }

  const deletes = [
    ...plan.deleteSurvivorParsed.map((podcastIndexId) => ({ podcastIndexId, retired: false })),
    ...plan.deleteRetired.map((podcastIndexId) => ({ podcastIndexId, retired: true })),
  ];
  const deleteBatch = deletes.slice(0, REMOTE_STUB_MERGE_MAX_DELETES_PER_RUN);
  let deletedSurvivorParsed = 0;
  let deletedRetired = 0;
  for (const entry of deleteBatch) {
    const stub = await findStub(entry.podcastIndexId);
    if (stub === null || !(await stubService.deleteById(stub.id))) {
      continue;
    }
    if (entry.retired) {
      deletedRetired += 1;
    } else {
      deletedSurvivorParsed += 1;
    }
  }

  const leftByCaps =
    plan.repoint.length - repointBatch.length + (deletes.length - deleteBatch.length);
  console.warn(
    `Remote stub merge apply: re-pointed ${repointed}, ` +
      `deleted ${deletedSurvivorGone} whose survivor is gone, ` +
      `deleted ${deletedSurvivorParsed} whose survivor Podverse parses, ` +
      `deleted ${deletedRetired} the list retires. ` +
      `${unavailable} lookups unavailable, ${failed} failed, ${leftByCaps} left for the next run.`
  );
}
