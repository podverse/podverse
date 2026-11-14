import { isValidNanoIdV2IdText } from '@podverse/orm';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import {
  isSeedablePodcast,
  parsePodcastIndexId,
  podcastChannelIdText,
} from '../v4Library/copyAccountLibraryLib.js';
import type { CatalogSeedCreate } from './seedAccountCatalogLib.js';

export type StageCatalogSource = 'subscribed' | 'viewed' | 'library';

export type StageCatalogShow = {
  id: string;
  sources: readonly StageCatalogSource[];
  podcast: V4PodcastKey | null;
};

export type StageCatalogLocalShow = {
  id: string;
  channelIdText: string;
  podcastIndexId: number;
  authorityUrl: string | null;
};

export type StageCatalogClassification = {
  subscribed: number;
  viewedNotSubscribed: number;
  libraryOnly: number;
  alreadyLocal: number;
  missing: number;
  nonPublic: number;
  spam: number;
  takedown: number;
  noPodcastIndexId: number;
  skippedNoAuthorityUrl: number;
  skippedInvalidId: number;
  creates: CatalogSeedCreate[];
  alreadyLocalShows: StageCatalogLocalShow[];
};

export type StageFeedParseState = {
  isParsing: Date | null;
  lastFinishedParseTime: Date | null;
  lastFailedParseTime: Date | null;
};

export type StageSettledParseRow = {
  settled: boolean;
  lastFinishedParseTime: Date | null;
};

export type StageSettledParseCounts = {
  settled: number;
  failedParse: number;
  waiting: number;
};

type UnseededBucket = 'nonPublic' | 'spam' | 'takedown' | 'noPodcastIndexId';

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function podcastPage(id: string): string {
  return `https://podverse.fm/podcast/${id}`;
}

function unseededBucket(podcast: V4PodcastKey): UnseededBucket {
  if (!podcast.isPublic) {
    return 'nonPublic';
  }
  const flagStatus = blankToNull(podcast.flagStatus);
  if (flagStatus === 'spam') {
    return 'spam';
  }
  if (flagStatus === 'takedown') {
    return 'takedown';
  }
  return 'noPodcastIndexId';
}

function sourceName(
  sources: readonly StageCatalogSource[]
): 'subscribed' | 'viewedNotSubscribed' | 'libraryOnly' {
  if (sources.includes('subscribed')) {
    return 'subscribed';
  }
  if (sources.includes('viewed')) {
    return 'viewedNotSubscribed';
  }
  return 'libraryOnly';
}

/**
 * Counts the shows a stage would seed. A show with several sources counts once.
 * Subscription wins over a view, and a view wins over a library-only row.
 * Creates are the shows a parse would add, sorted by id.
 */
export function classifyStageCatalog(
  shows: readonly StageCatalogShow[],
  catalog: LocalCatalog
): StageCatalogClassification {
  const result: StageCatalogClassification = {
    subscribed: 0,
    viewedNotSubscribed: 0,
    libraryOnly: 0,
    alreadyLocal: 0,
    missing: 0,
    nonPublic: 0,
    spam: 0,
    takedown: 0,
    noPodcastIndexId: 0,
    skippedNoAuthorityUrl: 0,
    skippedInvalidId: 0,
    creates: [],
    alreadyLocalShows: [],
  };

  for (const show of shows) {
    result[sourceName(show.sources)] += 1;
    const podcast = show.podcast;
    if (podcast === null) {
      result.missing += 1;
      continue;
    }
    if (!isSeedablePodcast(podcast)) {
      result[unseededBucket(podcast)] += 1;
      continue;
    }
    const podcastIndexId = parsePodcastIndexId(podcast.podcastIndexId);
    if (podcastIndexId === null) {
      result.noPodcastIndexId += 1;
      continue;
    }
    const channelIdText = podcastChannelIdText(podcast, catalog);
    if (channelIdText !== null) {
      result.alreadyLocal += 1;
      result.alreadyLocalShows.push({
        id: show.id,
        channelIdText,
        podcastIndexId,
        authorityUrl: blankToNull(podcast.authorityUrl),
      });
      continue;
    }
    const authorityUrl = blankToNull(podcast.authorityUrl);
    if (authorityUrl === null) {
      result.skippedNoAuthorityUrl += 1;
      continue;
    }
    if (!isValidNanoIdV2IdText(show.id)) {
      result.skippedInvalidId += 1;
      continue;
    }
    result.creates.push({ id: show.id, podcastIndexId, authorityUrl });
  }

  result.creates.sort((left, right) => compareText(left.id, right.id));
  return result;
}

/**
 * The first show, in id order, whose Podcast Index id or authority URL repeats.
 * A Podcast Index collision is reported before an authority URL collision.
 */
export function refusalForDuplicateCreates(creates: readonly CatalogSeedCreate[]): string | null {
  const ordered = [...creates].sort((left, right) => compareText(left.id, right.id));
  const byPodcastIndexId = new Map<number, CatalogSeedCreate>();
  const byAuthorityUrl = new Map<string, CatalogSeedCreate>();
  for (const show of ordered) {
    const earlierIndex = byPodcastIndexId.get(show.podcastIndexId);
    if (earlierIndex !== undefined) {
      return (
        `Refusing to seed ${podcastPage(show.id)} because that show is already ` +
        `${podcastPage(earlierIndex.id)}. Nothing was written.`
      );
    }
    const earlierUrl = byAuthorityUrl.get(show.authorityUrl);
    if (earlierUrl !== undefined && earlierUrl.podcastIndexId !== show.podcastIndexId) {
      return (
        `Refusing to seed ${podcastPage(show.id)} because Podcast Index id ` +
        `${earlierUrl.podcastIndexId} already uses that authority URL. Nothing was written.`
      );
    }
    byPodcastIndexId.set(show.podcastIndexId, show);
    byAuthorityUrl.set(show.authorityUrl, show);
  }
  return null;
}

/** True when no parse has started: parsing, finished, and failed are all unset. */
export function stageShowNeedsFirstParse(state: StageFeedParseState): boolean {
  return (
    state.isParsing === null &&
    state.lastFinishedParseTime === null &&
    state.lastFailedParseTime === null
  );
}

/**
 * True when the channel id equals the v4 podcast id. A different channel id, including an absorb
 * survivor, does not take a first parse.
 */
export function stageChannelTakesFirstParse(channelIdText: string, v4PodcastId: string): boolean {
  return channelIdText === v4PodcastId;
}

/**
 * Settled rows count as settled. A settled row with no finished parse also counts as failed.
 * A row that is not settled is still waiting.
 */
export function countSettledParses(rows: readonly StageSettledParseRow[]): StageSettledParseCounts {
  let settled = 0;
  let failedParse = 0;
  let waiting = 0;
  for (const row of rows) {
    if (row.settled) {
      settled += 1;
      if (row.lastFinishedParseTime === null) {
        failedParse += 1;
      }
    } else {
      waiting += 1;
    }
  }
  return { settled, failedParse, waiting };
}
