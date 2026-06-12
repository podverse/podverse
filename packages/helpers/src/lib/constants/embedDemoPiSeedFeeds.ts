import type { EmbedDemoShowcaseId } from './embedDemoShowcase.js';

export type EmbedDemoPiSeedItemSelection = 'latest-published' | 'latest-video';

export type EmbedDemoPiSeedFeedDef = {
  podcastIndexId: number;
  title: string;
  channelShowcaseId?: EmbedDemoShowcaseId;
  itemShowcaseId?: EmbedDemoShowcaseId;
  itemSelection?: EmbedDemoPiSeedItemSelection;
};

/** Podcast Index feeds used to seed `/embed` showcase rows (parse + upsert). */
export const EMBED_DEMO_PI_SEED_FEEDS: readonly EmbedDemoPiSeedFeedDef[] = [
  {
    podcastIndexId: 920666,
    title: 'Podcasting 2.0',
    channelShowcaseId: 'podcast-audio',
    itemShowcaseId: 'episode-audio',
  },
  {
    podcastIndexId: 6642704,
    title: 'Music From The Doerfel-Verse',
    channelShowcaseId: 'album-audio',
    itemShowcaseId: 'track-audio',
  },
  {
    podcastIndexId: 162612,
    title: 'Geek News Central Podcast (Video)',
    channelShowcaseId: 'podcast-video',
    itemShowcaseId: 'episode-video',
  },
  {
    podcastIndexId: 7814960,
    title: 'Them',
    channelShowcaseId: 'album-video',
    itemShowcaseId: 'track-video',
    itemSelection: 'latest-video',
  },
] as const;

/** Deduped showcase slot ids owned by the PI embed demo seed job. */
export function getEmbedDemoPiSeedManagedShowcaseIds(): EmbedDemoShowcaseId[] {
  const ids = new Set<EmbedDemoShowcaseId>();

  for (const feedDef of EMBED_DEMO_PI_SEED_FEEDS) {
    if (feedDef.channelShowcaseId !== undefined) {
      ids.add(feedDef.channelShowcaseId);
    }
    if (feedDef.itemShowcaseId !== undefined) {
      ids.add(feedDef.itemShowcaseId);
    }
  }

  return [...ids].sort();
}

export function resolveEmbedDemoPiSeedItemSelection(
  feedDef: EmbedDemoPiSeedFeedDef
): EmbedDemoPiSeedItemSelection {
  if (feedDef.itemSelection !== undefined) {
    return feedDef.itemSelection;
  }

  return 'latest-published';
}
