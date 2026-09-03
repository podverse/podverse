import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import {
  buildAlbumPath,
  buildEpisodePath,
  buildPodcastPath,
  buildTrackPath,
  MediumEnum,
} from '@podverse/helpers';

import type { MediaPlayerAddByRSSState } from '../../contexts/MediaPlayer';
import { getAddByRSSItemPath, getAddByRSSLivestreamPath } from '../addByRSS/itemPath';
import {
  selectItemChapterForTime,
  shouldSuppressChapterSelectionAtTime,
} from './selectItemChapterForTime';
import { getResolvedVtsLikeTargetItem } from './vtsOverrideLikeItem';

type ResolutionParams = {
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapter: DTOItemChapter | null;
  mpItemChapters: DTOItemChapter[] | null;
  currentTimeSeconds: number;
};

export type MediaPlayerInfoResolution = {
  /** Base episode/track title — never overridden by chapter/clip/soundbite. */
  itemTitle: string | null;
  /** Mini-player line: subsection title when present, else {@link itemTitle}. */
  displayItemTitle: string | null;
  channelTitle: string | null;
  channelLinkUrl: string;
  itemLinkUrl: string;
  subsectionTitle: string | null;
  subsectionUrl: string;
  subsectionStartTime: string | null;
  subsectionEndTime: string | null;
  resolvedLikeTarget: DTOItem | null;
};

const toNumber = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isChapterAtTime = (chapter: DTOItemChapter, currentTimeSeconds: number): boolean => {
  const start = toNumber(chapter.start_time);
  const end = toNumber(chapter.end_time ?? null);
  if (start === null || end === null) {
    return false;
  }
  return currentTimeSeconds >= start && currentTimeSeconds < end;
};

const pickActiveChapter = (
  mpItemChapter: DTOItemChapter | null,
  mpItemChapters: DTOItemChapter[] | null,
  currentTimeSeconds: number
): DTOItemChapter | null => {
  const chapters = mpItemChapters ?? [];
  const chaptersForZeroGuard =
    mpItemChapter !== null && !chapters.some((chapter) => chapter.id === mpItemChapter.id)
      ? [...chapters, mpItemChapter]
      : chapters;

  if (shouldSuppressChapterSelectionAtTime(chaptersForZeroGuard, currentTimeSeconds)) {
    return null;
  }

  const fromList = selectItemChapterForTime(chapters, currentTimeSeconds);
  if (fromList !== null) {
    return fromList;
  }

  if (mpItemChapter && isChapterAtTime(mpItemChapter, currentTimeSeconds)) {
    return mpItemChapter;
  }

  return mpItemChapter ?? null;
};

const resolveDefaultLinks = (
  mpChannel: DTOChannel | null,
  mpItem: DTOItem | null,
  mpAddByRSS: MediaPlayerAddByRSSState
): { channelLinkUrl: string; itemLinkUrl: string } => {
  if (mpAddByRSS) {
    const { idText, resourceData } = mpAddByRSS;
    const mediumId =
      typeof resourceData.medium_id === 'number' ? resourceData.medium_id : undefined;
    const itemLinkUrl =
      resourceData.start_time !== null && resourceData.start_time !== undefined
        ? getAddByRSSLivestreamPath(idText, mediumId === MediumEnum.Music ? 'music' : 'podcast')
        : mediumId === MediumEnum.Music
          ? getAddByRSSItemPath(idText, 'tracks')
          : getAddByRSSItemPath(idText, 'episodes');

    return { channelLinkUrl: '', itemLinkUrl };
  }

  if (!mpChannel?.medium_id) {
    return { channelLinkUrl: '', itemLinkUrl: '' };
  }

  if (mpChannel.medium_id === MediumEnum.Podcast || mpChannel.medium_id === MediumEnum.Video) {
    return {
      channelLinkUrl: buildPodcastPath(mpChannel.id_text),
      itemLinkUrl: mpItem ? buildEpisodePath(mpItem.id_text) : '',
    };
  }

  if (mpChannel.medium_id === MediumEnum.Music) {
    return {
      channelLinkUrl: buildAlbumPath(mpChannel.id_text),
      itemLinkUrl: mpItem ? buildTrackPath(mpItem.id_text) : '',
    };
  }

  return { channelLinkUrl: '', itemLinkUrl: '' };
};

const resolveSubsection = (
  mpClip: DTOClip | null,
  mpItemSoundbite: DTOItemSoundbite | null,
  activeChapter: DTOItemChapter | null
): {
  subsectionTitle: string | null;
  subsectionUrl: string;
  subsectionStartTime: string | null;
  subsectionEndTime: string | null;
} => {
  if (mpClip) {
    return {
      subsectionTitle: mpClip.title ?? null,
      subsectionUrl: `/clip/${mpClip.id_text}`,
      subsectionStartTime: mpClip.start_time ?? null,
      subsectionEndTime: mpClip.end_time ?? null,
    };
  }

  if (mpItemSoundbite) {
    const start = toNumber(mpItemSoundbite.start_time);
    const duration = toNumber(mpItemSoundbite.duration);
    const end = start !== null && duration !== null ? `${start + duration}` : null;
    return {
      subsectionTitle: mpItemSoundbite.title ?? null,
      subsectionUrl: `/official-clip/${mpItemSoundbite.id_text}`,
      subsectionStartTime: mpItemSoundbite.start_time ?? null,
      subsectionEndTime: end,
    };
  }

  if (activeChapter) {
    return {
      subsectionTitle: activeChapter.title ?? null,
      subsectionUrl: `/chapter/${activeChapter.id_text}`,
      subsectionStartTime: activeChapter.start_time ?? null,
      subsectionEndTime: activeChapter.end_time ?? null,
    };
  }

  return {
    subsectionTitle: null,
    subsectionUrl: '',
    subsectionStartTime: null,
    subsectionEndTime: null,
  };
};

/**
 * Shared full/mini resolution entrypoint. VTS falls back to base item/channel
 * metadata when DTO/API payloads do not include remote-target details.
 */
export const getMediaPlayerInfoResolution = ({
  mpChannel,
  mpItem,
  mpAddByRSS,
  mpClip,
  mpItemSoundbite,
  mpItemChapter,
  mpItemChapters,
  currentTimeSeconds,
}: ResolutionParams): MediaPlayerInfoResolution => {
  const activeChapter = pickActiveChapter(mpItemChapter, mpItemChapters, currentTimeSeconds);
  const resolvedLikeTarget = mpItem
    ? getResolvedVtsLikeTargetItem(mpItem, currentTimeSeconds)
    : null;

  const { channelLinkUrl, itemLinkUrl } = resolveDefaultLinks(mpChannel, mpItem, mpAddByRSS);
  const { subsectionTitle, subsectionUrl, subsectionStartTime, subsectionEndTime } =
    resolveSubsection(mpClip, mpItemSoundbite, activeChapter);

  const itemTitleFromSource =
    (typeof mpAddByRSS?.resourceData?.title === 'string' ? mpAddByRSS.resourceData.title : null) ??
    resolvedLikeTarget?.title ??
    mpItem?.title ??
    null;
  const channelTitle =
    (typeof mpAddByRSS?.resourceData?.channel_title === 'string'
      ? mpAddByRSS.resourceData.channel_title
      : null) ??
    mpChannel?.title ??
    null;

  return {
    itemTitle: itemTitleFromSource,
    displayItemTitle: subsectionTitle ?? itemTitleFromSource,
    channelTitle,
    channelLinkUrl,
    itemLinkUrl,
    subsectionTitle,
    subsectionUrl,
    subsectionStartTime,
    subsectionEndTime,
    resolvedLikeTarget,
  };
};
