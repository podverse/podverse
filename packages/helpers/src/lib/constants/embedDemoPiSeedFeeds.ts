import type { EmbedDemoShowcaseId } from './embedDemoShowcase.js';

export type EmbedDemoPiSeedItemSelection = 'latest-published' | 'latest-video';

export type EmbedDemoPiSeedFeedDef = {
  podcastIndexId: number;
  title: string;
  channelShowcaseId?: EmbedDemoShowcaseId;
  itemShowcaseId?: EmbedDemoShowcaseId;
  itemSelection?: EmbedDemoPiSeedItemSelection;
  /**
   * When set, the item showcase loads the item with this RSS `<guid>` instead of
   * applying `itemSelection`. Lets the demo pin specific content rather than latest.
   */
  itemGuid?: string;
  /**
   * When set on a list showcase (`channelShowcaseId`), the resolved item's `id_text`
   * is stored as the showcase default play item so the list embed loads with that
   * row selected (via the `play_id_text` URL parameter). Identified by RSS `<guid>`.
   */
  channelPlayItemGuid?: string;
  /** When set, PI seed creates/updates a public Sample Clip and upserts this showcase slot. */
  seedClipShowcaseId?: EmbedDemoShowcaseId;
  /** When set, PI seed parses chapters and upserts the middle chapter into this slot. */
  seedChapterShowcaseId?: EmbedDemoShowcaseId;
  /**
   * When set, PI seed creates/updates several public clips on the channel's recent items
   * and upserts this channel-resource showcase slot (rendered as a `?type=clips` list).
   */
  clipsListShowcaseId?: EmbedDemoShowcaseId;
  /**
   * When set, PI seed resolves a chapter-bearing item, parses + persists its chapters, and
   * upserts this item-resource showcase slot (rendered via the `episode-chapters` list route).
   */
  chaptersListShowcaseId?: EmbedDemoShowcaseId;
};

/** Podcast Index feeds that seed `/embed` showcase rows through parse and upsert. */
export const EMBED_DEMO_PI_SEED_FEEDS: readonly EmbedDemoPiSeedFeedDef[] = [
  {
    podcastIndexId: 920666,
    title: 'Podcasting 2.0',
    channelShowcaseId: 'podcast-audio',
    itemShowcaseId: 'episode-audio',
    seedClipShowcaseId: 'clip-audio',
    seedChapterShowcaseId: 'chapter-audio',
    clipsListShowcaseId: 'podcast-clips-audio',
    chaptersListShowcaseId: 'episode-chapters-audio',
  },
  {
    podcastIndexId: 6642704,
    title: 'Music From The Doerfel-Verse',
    channelShowcaseId: 'album-audio',
    itemShowcaseId: 'track-audio',
    itemGuid: 'caae8d61-bedd-40d9-ad57-8c86c1509020',
  },
  {
    podcastIndexId: 162612,
    title: 'Geek News Central Podcast (Video)',
    channelShowcaseId: 'podcast-video',
    itemShowcaseId: 'episode-video',
    itemGuid: 'https://geeknewscentral.com/?p=107326',
    channelPlayItemGuid: 'https://geeknewscentral.com/?p=107602',
    seedClipShowcaseId: 'clip-video',
    seedChapterShowcaseId: 'chapter-video',
    clipsListShowcaseId: 'podcast-clips-video',
    chaptersListShowcaseId: 'episode-chapters-video',
  },
  {
    podcastIndexId: 7814960,
    title: 'Them',
    channelShowcaseId: 'album-video',
    itemShowcaseId: 'track-video',
    itemGuid: '9ac3be63-c9a3-4065-88fe-5f07006a1abe',
    channelPlayItemGuid: 'b5f23697-1027-476d-a342-7e552daaeaa4',
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
    if (feedDef.seedClipShowcaseId !== undefined) {
      ids.add(feedDef.seedClipShowcaseId);
    }
    if (feedDef.seedChapterShowcaseId !== undefined) {
      ids.add(feedDef.seedChapterShowcaseId);
    }
    if (feedDef.clipsListShowcaseId !== undefined) {
      ids.add(feedDef.clipsListShowcaseId);
    }
    if (feedDef.chaptersListShowcaseId !== undefined) {
      ids.add(feedDef.chaptersListShowcaseId);
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
