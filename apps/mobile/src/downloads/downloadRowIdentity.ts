import { formatDateAbbrev } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { isAlbumMediumId, isArtistMediumId } from '@podverse/helpers/medium';

import { itemArtistNames } from '../lib/playback/verifiedArtists';
import { usableDownloadChannelText } from './downloadChannelIdentity';
import type { DownloadRecord } from './downloadTypes';

export type DownloadRowKind = 'music' | 'podcast';

export type DownloadRowIdentity = {
  /**
   * Spoken parts for the row, already ordered. Status is appended by the screen.
   */
  accessibilityParts: string[];
  /** Album or show overline. Null when the row has no channel or album line. */
  contextTitle: string | null;
  /** Publish date for podcast rows only. Null for music and when the date is missing. */
  dateLabel: string | null;
  kind: DownloadRowKind;
  /**
   * Artist under the track for album-channel music. Null when absent, when the name matches the
   * album line, or when the artist is already the context overline.
   */
  secondaryTitle: string | null;
  /** Episode or track title. */
  title: string;
};

const usableText = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const musicMediumId = (item: DTOItem | null): number | null => {
  if (item === null) {
    return null;
  }
  return item.channel?.medium_id ?? null;
};

const isMusicDownload = (item: DTOItem | null): boolean => {
  const mediumId = musicMediumId(item);
  return isAlbumMediumId(mediumId) || isArtistMediumId(mediumId);
};

const artistFromItem = (item: DTOItem): string | null => {
  const verified = itemArtistNames(item);
  if (verified !== null) {
    return verified;
  }
  return usableText(item.channel?.channel_about?.author);
};

const podcastDateLabel = (item: DTOItem | null, language: string): string | null => {
  const pubDate = item?.pub_date;
  if (pubDate === null || pubDate === undefined || pubDate.length === 0) {
    return null;
  }
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatDateAbbrev(parsed, language);
};

/**
 * Display lines for one Downloads list row. Uses the stored playable item when present so music
 * can name album and artist; falls back to the download index scalars alone.
 */
export const downloadRowIdentity = (
  record: DownloadRecord,
  item: DTOItem | null,
  language: string
): DownloadRowIdentity => {
  const title = usableText(record.title) ?? record.itemIdText;
  const channelTitle = usableDownloadChannelText(record.channelTitle);

  if (!isMusicDownload(item)) {
    const dateLabel = podcastDateLabel(item, language);
    return {
      accessibilityParts: [channelTitle, title, dateLabel].filter(
        (part): part is string => part !== null
      ),
      contextTitle: channelTitle,
      dateLabel,
      kind: 'podcast',
      secondaryTitle: null,
      title,
    };
  }

  // `isMusicDownload` is true only when a stored item has an album or artist medium.
  if (item === null) {
    return {
      accessibilityParts: [channelTitle, title].filter((part): part is string => part !== null),
      contextTitle: channelTitle,
      dateLabel: null,
      kind: 'music',
      secondaryTitle: null,
      title,
    };
  }

  const mediumId = musicMediumId(item);
  if (isArtistMediumId(mediumId)) {
    const artist = channelTitle ?? artistFromItem(item);
    return {
      accessibilityParts: [artist, title].filter((part): part is string => part !== null),
      contextTitle: artist,
      dateLabel: null,
      kind: 'music',
      secondaryTitle: null,
      title,
    };
  }

  const album = channelTitle ?? usableText(item.channel?.title);
  const artist = artistFromItem(item);
  const secondaryTitle = artist !== null && artist !== album ? artist : null;

  return {
    accessibilityParts: [album, title, secondaryTitle].filter(
      (part): part is string => part !== null
    ),
    contextTitle: album,
    dateLabel: null,
    kind: 'music',
    secondaryTitle,
    title,
  };
};
