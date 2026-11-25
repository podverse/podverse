import { resolveDeadFeedDuplicateChains } from '@podverse/external-services-podcast-index';
import type { IndexProvider, IndexProviderFeed } from '@podverse/helpers';

export type CatalogAllowlistAddTarget = {
  podcastIndexId: number;
  feedUrl: string;
  /** The listed id this target stands for; differs from `podcastIndexId` after a merge. */
  sourcePodcastIndexId: number;
};

export type CatalogAllowlistLookupRecord = {
  listedPodcastIndexId: number;
  /** Null when the listed id is the live directory id. */
  resolvedPodcastIndexId: number | null;
  title: string | null;
  feedUrl: string | null;
};

export type CatalogAllowlistAddPlan = {
  targets: CatalogAllowlistAddTarget[];
  records: CatalogAllowlistLookupRecord[];
  /** Listed ids whose lookup failed; a later run retries them. */
  unavailable: number[];
  /** Listed ids that are dead or unknown with no live surviving show. */
  unresolved: number[];
};

type CollectCatalogAllowlistAddTargetsParams = {
  allowlist: readonly number[];
  storedPodcastIndexIds: ReadonlySet<number>;
  indexProvider: Pick<IndexProvider, 'getFeedById'>;
  /** Dead-feed CSV rows: archived id to the id it was merged into, or null. */
  loadDeadFeedTargets: () => Promise<ReadonlyMap<number, number | null>>;
  sleepBetweenLookups: () => Promise<void>;
};

function reportedPodcastIndexId(feed: IndexProviderFeed): number | null {
  if (!/^[1-9]\d*$/.test(feed.providerFeedId)) {
    return null;
  }
  const id = Number(feed.providerFeedId);
  return Number.isSafeInteger(id) ? id : null;
}

export async function collectCatalogAllowlistAddTargets({
  allowlist,
  storedPodcastIndexIds,
  indexProvider,
  loadDeadFeedTargets,
  sleepBetweenLookups,
}: CollectCatalogAllowlistAddTargetsParams): Promise<CatalogAllowlistAddPlan> {
  const listed = new Set(allowlist);
  const targets: CatalogAllowlistAddTarget[] = [];
  const records: CatalogAllowlistLookupRecord[] = [];
  const unavailable: number[] = [];
  const unresolved: number[] = [];
  const needsSurvivor: number[] = [];
  const queued = new Set<number>();
  let lookups = 0;

  const lookUp = async (podcastIndexId: number) => {
    if (lookups > 0) {
      await sleepBetweenLookups();
    }
    lookups += 1;
    return indexProvider.getFeedById(String(podcastIndexId));
  };

  for (const podcastIndexId of listed) {
    if (storedPodcastIndexIds.has(podcastIndexId)) {
      continue;
    }
    const lookup = await lookUp(podcastIndexId);
    if (lookup.status === 'unavailable') {
      unavailable.push(podcastIndexId);
    } else if (lookup.status === 'found' && !lookup.value.isDead) {
      const reported = reportedPodcastIndexId(lookup.value);
      const liveId =
        reported !== null && reported !== podcastIndexId ? reported : podcastIndexId;
      const moved = liveId !== podcastIndexId;
      records.push({
        listedPodcastIndexId: podcastIndexId,
        resolvedPodcastIndexId: moved ? liveId : null,
        title: lookup.value.title,
        feedUrl: lookup.value.feedUrl,
      });
      const covered =
        storedPodcastIndexIds.has(liveId) ||
        queued.has(liveId) ||
        (moved && listed.has(liveId));
      if (!covered) {
        targets.push({
          podcastIndexId: liveId,
          feedUrl: lookup.value.feedUrl,
          sourcePodcastIndexId: podcastIndexId,
        });
        queued.add(liveId);
      }
    } else {
      needsSurvivor.push(podcastIndexId);
    }
  }

  if (needsSurvivor.length === 0) {
    return { targets, records, unavailable, unresolved };
  }

  const survivors = resolveDeadFeedDuplicateChains(await loadDeadFeedTargets());
  for (const sourcePodcastIndexId of needsSurvivor) {
    const survivorId = survivors.get(sourcePodcastIndexId);
    if (survivorId === undefined) {
      unresolved.push(sourcePodcastIndexId);
      continue;
    }
    if (
      storedPodcastIndexIds.has(survivorId) ||
      listed.has(survivorId) ||
      queued.has(survivorId)
    ) {
      records.push({
        listedPodcastIndexId: sourcePodcastIndexId,
        resolvedPodcastIndexId: survivorId,
        title: null,
        feedUrl: null,
      });
      continue;
    }
    const lookup = await lookUp(survivorId);
    if (lookup.status === 'unavailable') {
      unavailable.push(sourcePodcastIndexId);
    } else if (lookup.status === 'found' && !lookup.value.isDead) {
      const reported = reportedPodcastIndexId(lookup.value);
      const liveId = reported !== null && reported !== survivorId ? reported : survivorId;
      records.push({
        listedPodcastIndexId: sourcePodcastIndexId,
        resolvedPodcastIndexId: liveId === sourcePodcastIndexId ? null : liveId,
        title: lookup.value.title,
        feedUrl: lookup.value.feedUrl,
      });
      if (!storedPodcastIndexIds.has(liveId) && !listed.has(liveId) && !queued.has(liveId)) {
        targets.push({
          podcastIndexId: liveId,
          feedUrl: lookup.value.feedUrl,
          sourcePodcastIndexId,
        });
        queued.add(liveId);
      }
    } else {
      unresolved.push(sourcePodcastIndexId);
    }
  }

  return { targets, records, unavailable, unresolved };
}
