import { resolveDeadFeedDuplicateChains } from '@podverse/external-services-podcast-index';
import type { IndexProvider } from '@podverse/helpers';

export type CatalogAllowlistAddTarget = {
  podcastIndexId: number;
  feedUrl: string;
  /** The listed id this target stands for; differs from `podcastIndexId` after a merge. */
  sourcePodcastIndexId: number;
};

export type CatalogAllowlistAddPlan = {
  targets: CatalogAllowlistAddTarget[];
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

export async function collectCatalogAllowlistAddTargets({
  allowlist,
  storedPodcastIndexIds,
  indexProvider,
  loadDeadFeedTargets,
  sleepBetweenLookups,
}: CollectCatalogAllowlistAddTargetsParams): Promise<CatalogAllowlistAddPlan> {
  const listed = new Set(allowlist);
  const targets: CatalogAllowlistAddTarget[] = [];
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
      targets.push({
        podcastIndexId,
        feedUrl: lookup.value.feedUrl,
        sourcePodcastIndexId: podcastIndexId,
      });
      queued.add(podcastIndexId);
    } else {
      needsSurvivor.push(podcastIndexId);
    }
  }

  if (needsSurvivor.length === 0) {
    return { targets, unavailable, unresolved };
  }

  const survivors = resolveDeadFeedDuplicateChains(await loadDeadFeedTargets());
  for (const sourcePodcastIndexId of needsSurvivor) {
    const survivorId = survivors.get(sourcePodcastIndexId);
    if (survivorId === undefined) {
      unresolved.push(sourcePodcastIndexId);
      continue;
    }
    if (storedPodcastIndexIds.has(survivorId) || listed.has(survivorId) || queued.has(survivorId)) {
      continue;
    }
    const lookup = await lookUp(survivorId);
    if (lookup.status === 'unavailable') {
      unavailable.push(sourcePodcastIndexId);
    } else if (lookup.status === 'found' && !lookup.value.isDead) {
      targets.push({
        podcastIndexId: survivorId,
        feedUrl: lookup.value.feedUrl,
        sourcePodcastIndexId,
      });
      queued.add(survivorId);
    } else {
      unresolved.push(sourcePodcastIndexId);
    }
  }

  return { targets, unavailable, unresolved };
}
