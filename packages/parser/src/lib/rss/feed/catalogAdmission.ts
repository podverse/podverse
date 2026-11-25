import { getOptionalCatalogAdmissionPolicy, getOptionalIndexProvider } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';

import {
  getMediumEnumValue,
  isMusicMediumId,
  MediumEnum,
  resolveParserMaxFeedBodyBytes,
} from '@podverse/helpers';
import { detectDuckTypedPublisherMediumId } from '@podverse/parser-mapping';

import type { FeedNotInCatalogReason } from '../errors.js';
import { FeedNotInCatalogError } from '../errors.js';
import { getAndParseRSSFeed } from '../parser.js';

type AssertCatalogAdmitsNewFeedParams = {
  url: string;
  podcastIndexId: number;
  /** A listed id that Podcast Index merged into `podcastIndexId`. */
  catalogAllowlistSourcePodcastIndexId: number | undefined;
};

/**
 * Throws FeedNotInCatalogError when the catalog settings refuse a feed with no stored row.
 * Callers run this only after every stored-row lookup came back empty.
 */
export async function assertCatalogAdmitsNewFeed({
  url,
  podcastIndexId,
  catalogAllowlistSourcePodcastIndexId,
}: AssertCatalogAdmitsNewFeedParams): Promise<void> {
  const policy = getOptionalCatalogAdmissionPolicy();
  if (policy === null) {
    return;
  }

  const { podcastIndexIdAllowlist } = policy;
  if (podcastIndexIdAllowlist !== null) {
    const listed =
      podcastIndexIdAllowlist.includes(podcastIndexId) ||
      (catalogAllowlistSourcePodcastIndexId !== undefined &&
        podcastIndexIdAllowlist.includes(catalogAllowlistSourcePodcastIndexId));
    if (!listed) {
      throw new FeedNotInCatalogError(podcastIndexId, 'not_on_allowlist');
    }
  }

  if (!policy.musicEnabled) {
    const reason = await readMusicRefusal(url, podcastIndexId);
    if (reason !== null) {
      throw new FeedNotInCatalogError(podcastIndexId, reason);
    }
  }
}

async function readMusicRefusal(
  url: string,
  podcastIndexId: number
): Promise<FeedNotInCatalogReason | null> {
  const indexProvider = getOptionalIndexProvider();
  if (indexProvider === null) {
    return 'medium_unknown';
  }

  const lookup = await indexProvider.getFeedById(String(podcastIndexId));
  if (lookup.status !== 'found') {
    return 'medium_unknown';
  }

  const mediumId = getMediumEnumValue(lookup.value.medium);
  if (isMusicMediumId(mediumId)) {
    return 'music';
  }
  if (mediumId !== MediumEnum.Publisher) {
    return null;
  }

  try {
    const parsedFeed = await getAndParseRSSFeed(
      url,
      resolveParserMaxFeedBodyBytes(process.env.PARSER_MAX_FEED_BODY_BYTES)
    );
    return isMusicMediumId(detectDuckTypedPublisherMediumId(parsedFeed)) ? 'music' : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loggerService.warn(
      `assertCatalogAdmitsNewFeed: publisher fetch failed podcast_index_id=${podcastIndexId} url=${url} reason=${message}`
    );
    return 'medium_unknown';
  }
}
