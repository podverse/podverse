import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { isAlbumMediumId, parseMediumId } from '@podverse/helpers';

import type { ArtistLineLink } from '../../lib/artistPublishers';
import { normalizeAddByRSSGuid, toAddByRSSComparableFeedUrl } from './listedFeeds';
import type {
  AddByRSSAlbumSource,
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSPublisherLinkRecord,
} from './types';

export const addByRSSArtistPath = (idText: string): string => `/add-by-rss/artist/${idText}`;

/** Artist links that stay when Add by RSS is off: the ones that do not open an Add by RSS page. */
export const withoutAddByRSSArtistLinks = (
  links: readonly ArtistLineLink[]
): readonly ArtistLineLink[] => {
  const addByRSSArtistPrefix = addByRSSArtistPath('');
  return links.filter((link) => !link.href.startsWith(addByRSSArtistPrefix));
};

/** The album's own `podcast:guid`, normalized. */
export const getAddByRSSFeedGuid = (feed: AddByRSSFeedRecord): string | null =>
  normalizeAddByRSSGuid(feed.mappedFeed?.channel?.channel?.podcast_guid);

/** Guids the feed's `<podcast:publisher>` pointers name, normalized, in order, each once. */
export const getAddByRSSFeedPublisherRefs = (
  feed: AddByRSSFeedRecord
): { feedGuid: string; feedUrl: string | null }[] => {
  const refs: { feedGuid: string; feedUrl: string | null }[] = [];
  const seen = new Set<string>();
  for (const item of feed.mappedFeed?.channel?.publisherRemoteItems ?? []) {
    const feedGuid = normalizeAddByRSSGuid(item.feed_guid);
    if (feedGuid === null || seen.has(feedGuid)) {
      continue;
    }
    seen.add(feedGuid);
    refs.push({ feedGuid, feedUrl: item.feed_url ?? null });
  }
  return refs;
};

/** True when the mapped feed is an album medium. A record not parsed yet is not. */
export const isAddByRSSAlbumFeed = (feed: AddByRSSFeedRecord): boolean =>
  isAlbumMediumId(parseMediumId(feed.mappedFeed?.channel?.channel?.medium_id));

/** Followed records, then listed records whose comparable URL no followed record has. */
export const mergeAddByRSSAlbumSources = (
  followed: readonly AddByRSSFeedRecord[],
  listed: readonly AddByRSSListedFeedRecord[]
): AddByRSSAlbumSource[] => {
  const followedUrls = new Set(followed.map((feed) => toAddByRSSComparableFeedUrl(feed.feedUrl)));
  const sources: AddByRSSAlbumSource[] = followed.map((feed) => ({ followed: true, feed }));
  for (const feed of listed) {
    if (followedUrls.has(toAddByRSSComparableFeedUrl(feed.feedUrl))) {
      continue;
    }
    sources.push({ followed: false, feed });
  }
  return sources;
};

export type AddByRSSArtistAlbumEntry =
  | { kind: 'add_by_rss'; source: AddByRSSAlbumSource }
  | { kind: 'directory'; channelIdText: string; title: string; feedGuid: string };

/**
 * The source with this row's feed URL, when the row has one and a source matches it.
 * Otherwise the first source with the row's guid.
 */
const findAddByRSSAlbumSource = (
  row: AddByRSSPublisherListedFeed,
  sources: readonly AddByRSSAlbumSource[]
): AddByRSSAlbumSource | undefined => {
  if (row.feedUrl !== null) {
    const rowUrl = toAddByRSSComparableFeedUrl(row.feedUrl);
    const byUrl = sources.find(
      (source) => toAddByRSSComparableFeedUrl(source.feed.feedUrl) === rowUrl
    );
    if (byUrl !== undefined) {
      return byUrl;
    }
  }
  const rowGuid = normalizeAddByRSSGuid(row.feedGuid);
  if (rowGuid === null) {
    return undefined;
  }
  return sources.find((source) => getAddByRSSFeedGuid(source.feed) === rowGuid);
};

/** Unparsed records stay: the album may still be parsing. A parsed non-album does not. */
const isAlbumOrUnparsedSource = (source: AddByRSSAlbumSource): boolean =>
  source.feed.mappedFeed === undefined || isAddByRSSAlbumFeed(source.feed);

export const resolveAddByRSSArtistAlbums = (input: {
  artist: AddByRSSFeedRecord;
  link: AddByRSSPublisherLinkRecord | null;
  sources: readonly AddByRSSAlbumSource[];
}): AddByRSSArtistAlbumEntry[] => {
  const { artist, sources } = input;
  const artistGuid = getAddByRSSFeedGuid(artist);
  const artistUrl = toAddByRSSComparableFeedUrl(artist.feedUrl);
  const entries: AddByRSSArtistAlbumEntry[] = [];
  const seenDirectoryIds = new Set<string>();
  const seenAlbumUrls = new Set<string>();

  const feedIsArtist = (feed: AddByRSSFeedRecord): boolean =>
    feed.idText === artist.idText || toAddByRSSComparableFeedUrl(feed.feedUrl) === artistUrl;

  const pushAddByRss = (source: AddByRSSAlbumSource): void => {
    if (feedIsArtist(source.feed) || !isAlbumOrUnparsedSource(source)) {
      return;
    }
    const key = toAddByRSSComparableFeedUrl(source.feed.feedUrl);
    if (seenAlbumUrls.has(key)) {
      return;
    }
    seenAlbumUrls.add(key);
    entries.push({ kind: 'add_by_rss', source });
  };

  for (const row of input.link?.listedFeeds ?? []) {
    if (!row.listedAtChannelLevel) {
      continue;
    }
    if (row.kind === 'directory') {
      if (row.mediumId !== null && !isAlbumMediumId(row.mediumId)) {
        continue;
      }
      if (seenDirectoryIds.has(row.channelIdText)) {
        continue;
      }
      seenDirectoryIds.add(row.channelIdText);
      entries.push({
        kind: 'directory',
        channelIdText: row.channelIdText,
        title: row.channelTitle ?? row.title ?? row.channelIdText,
        feedGuid: row.feedGuid,
      });
      continue;
    }
    if (row.kind === 'add_by_rss') {
      const source = findAddByRSSAlbumSource(row, sources);
      if (source !== undefined) {
        pushAddByRss(source);
      }
    }
  }

  if (artistGuid !== null) {
    for (const source of sources) {
      if (!isAddByRSSAlbumFeed(source.feed)) {
        continue;
      }
      const namesArtist = getAddByRSSFeedPublisherRefs(source.feed).some(
        (ref) => ref.feedGuid === artistGuid
      );
      if (namesArtist) {
        pushAddByRss(source);
      }
    }
  }

  return entries;
};

export type AddByRSSArtistTrackRef = {
  source: AddByRSSAlbumSource;
  /** Null: every track. Otherwise only these item guids. */
  itemGuids: ReadonlySet<string> | null;
};

export const resolveAddByRSSArtistTrackRefs = (input: {
  link: AddByRSSPublisherLinkRecord | null;
  albums: readonly AddByRSSArtistAlbumEntry[];
  sources: readonly AddByRSSAlbumSource[];
}): AddByRSSArtistTrackRef[] => {
  const byUrl = new Map<string, { source: AddByRSSAlbumSource; itemGuids: Set<string> | null }>();

  for (const album of input.albums) {
    if (album.kind !== 'add_by_rss') {
      continue;
    }
    const key = toAddByRSSComparableFeedUrl(album.source.feed.feedUrl);
    if (!byUrl.has(key)) {
      byUrl.set(key, { source: album.source, itemGuids: null });
    }
  }

  for (const row of input.link?.listedFeeds ?? []) {
    if (row.listedAtChannelLevel || row.itemGuids.length === 0 || row.kind === 'directory') {
      continue;
    }
    const source = findAddByRSSAlbumSource(row, input.sources);
    if (source === undefined || !isAlbumOrUnparsedSource(source)) {
      continue;
    }
    const key = toAddByRSSComparableFeedUrl(source.feed.feedUrl);
    const existing = byUrl.get(key);
    if (existing?.itemGuids === null) {
      continue;
    }
    const itemGuids = existing?.itemGuids ?? new Set<string>();
    for (const itemGuid of row.itemGuids) {
      const trimmed = itemGuid.trim();
      if (trimmed.length > 0) {
        itemGuids.add(trimmed);
      }
    }
    if (!byUrl.has(key)) {
      byUrl.set(key, { source, itemGuids });
    }
  }

  return [...byUrl.values()];
};

/** Add by RSS albums on this browser whose publisher pointer names `publisherGuid`. */
export const addByRSSAlbumsNamingPublisher = (
  sources: readonly AddByRSSAlbumSource[],
  publisherGuid: string | null | undefined
): AddByRSSAlbumSource[] => {
  const guid = normalizeAddByRSSGuid(publisherGuid);
  if (guid === null) {
    return [];
  }
  return sources.filter(
    (source) =>
      isAddByRSSAlbumFeed(source.feed) &&
      getAddByRSSFeedPublisherRefs(source.feed).some((ref) => ref.feedGuid === guid)
  );
};

export type AddByRSSAlbumArtistResolution =
  | { kind: 'add_by_rss'; links: ArtistLineLink[] }
  | { kind: 'directory_lookup'; refs: { feedGuid: string; feedUrl: string | null }[] }
  | { kind: 'none' };

const artistLineLinkFromPublisher = (link: AddByRSSPublisherLinkRecord): ArtistLineLink | null => {
  const title = link.publisherTitle.trim();
  if (title.length === 0) {
    return null;
  }
  return {
    idText: link.publisherIdText,
    title,
    href: addByRSSArtistPath(link.publisherIdText),
  };
};

const pushPublisherLinkOnce = (
  ordered: AddByRSSPublisherLinkRecord[],
  seen: Set<string>,
  link: AddByRSSPublisherLinkRecord
): void => {
  const key = toAddByRSSComparableFeedUrl(link.publisherFeedUrl);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  ordered.push(link);
};

const toArtistLineLinks = (links: readonly AddByRSSPublisherLinkRecord[]): ArtistLineLink[] => {
  const lineLinks: ArtistLineLink[] = [];
  for (const link of links) {
    const lineLink = artistLineLinkFromPublisher(link);
    if (lineLink !== null) {
      lineLinks.push(lineLink);
    }
  }
  return lineLinks;
};

const listedRowMatchesAlbum = (
  row: AddByRSSPublisherListedFeed,
  albumUrl: string,
  albumGuid: string | null
): boolean => {
  if (!row.listedAtChannelLevel) {
    return false;
  }
  if (row.feedUrl !== null && toAddByRSSComparableFeedUrl(row.feedUrl) === albumUrl) {
    return true;
  }
  return albumGuid !== null && normalizeAddByRSSGuid(row.feedGuid) === albumGuid;
};

export const resolveAddByRSSAlbumArtists = (input: {
  album: AddByRSSFeedRecord;
  links: readonly AddByRSSPublisherLinkRecord[];
}): AddByRSSAlbumArtistResolution => {
  if (!isAddByRSSAlbumFeed(input.album)) {
    return { kind: 'none' };
  }

  const albumGuid = getAddByRSSFeedGuid(input.album);
  const albumUrl = toAddByRSSComparableFeedUrl(input.album.feedUrl);
  const refs = getAddByRSSFeedPublisherRefs(input.album);
  const ordered: AddByRSSPublisherLinkRecord[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    for (const link of input.links) {
      if (normalizeAddByRSSGuid(link.publisherGuid) === ref.feedGuid) {
        pushPublisherLinkOnce(ordered, seen, link);
      }
    }
  }

  for (const link of input.links) {
    if (link.listedFeeds.some((row) => listedRowMatchesAlbum(row, albumUrl, albumGuid))) {
      pushPublisherLinkOnce(ordered, seen, link);
    }
  }

  const links = toArtistLineLinks(ordered);
  if (links.length > 0) {
    return { kind: 'add_by_rss', links };
  }
  if (refs.length > 0) {
    return { kind: 'directory_lookup', refs };
  }
  return { kind: 'none' };
};

/** Add by RSS artists on this browser that list a directory album. */
export const resolveDirectoryAlbumAddByRSSArtists = (input: {
  channelIdText: string;
  podcastGuid: string | null | undefined;
  links: readonly AddByRSSPublisherLinkRecord[];
}): ArtistLineLink[] => {
  const podcastGuid = normalizeAddByRSSGuid(input.podcastGuid);
  const ordered: AddByRSSPublisherLinkRecord[] = [];
  const seen = new Set<string>();

  for (const link of input.links) {
    const listsAlbum = link.listedFeeds.some((row) => {
      if (!row.listedAtChannelLevel) {
        return false;
      }
      if (row.kind === 'directory' && row.channelIdText === input.channelIdText) {
        return true;
      }
      return podcastGuid !== null && normalizeAddByRSSGuid(row.feedGuid) === podcastGuid;
    });
    if (listsAlbum) {
      pushPublisherLinkOnce(ordered, seen, link);
    }
  }

  return toArtistLineLinks(ordered);
};
