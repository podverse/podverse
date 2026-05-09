import type {
  AddByRSSResourceData,
  AddByRSSResourceDataImageEntry,
} from '../../dtos/addByRSSResourceData.js';
import {
  mergeDTOItemThenChannelImageHeroCandidates,
  prependDistinctImageCandidate,
} from '../image.js';

type ChannelImages = AddByRSSResourceDataImageEntry[] | null | undefined;
type ItemImages = AddByRSSResourceDataImageEntry[] | null | undefined;

type MediaPlayerChannelLike = {
  channel_images?: ChannelImages;
} | null;

type MediaPlayerItemLike = {
  item_images?: ItemImages;
  channel?: {
    channel_images?: ChannelImages;
  } | null;
} | null;

type MediaPlayerAddByRSSResourceDataLike = AddByRSSResourceData | null | undefined;

type ChapterLike = {
  img?: string | null;
} | null;

export type BuildMediaPlayerArtworkImageCandidatesParams = {
  channelImages: ChannelImages;
  itemImages: ItemImages;
  chapterImageUrl?: string | null;
  includeChapterImage: boolean;
  imageSizeTarget: number | 'largest' | 'smallest';
  imageSizeComparison?: 'greater' | 'lesser' | null;
};

export type GetMediaPlayerArtworkSourcesParams = {
  mpChannel: MediaPlayerChannelLike;
  mpItem: MediaPlayerItemLike;
  mpAddByRSSResourceData: MediaPlayerAddByRSSResourceDataLike;
};

export type ShouldUseChapterArtworkParams = {
  mpItemChapter: ChapterLike;
  mpClip: object | null;
  mpItemSoundbite: object | null;
};

const getTrimmedCandidateUrl = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

export const shouldUseChapterArtwork = ({
  mpItemChapter,
  mpClip,
  mpItemSoundbite,
}: ShouldUseChapterArtworkParams) => {
  return Boolean(mpItemChapter && !mpClip && !mpItemSoundbite);
};

export const getMediaPlayerArtworkSources = ({
  mpChannel,
  mpItem,
  mpAddByRSSResourceData,
}: GetMediaPlayerArtworkSourcesParams) => {
  const channelImages =
    mpChannel?.channel_images ??
    mpItem?.channel?.channel_images ??
    mpAddByRSSResourceData?.channel_images;

  const itemImages = mpItem?.item_images ?? mpAddByRSSResourceData?.item_images;

  return {
    channelImages,
    itemImages,
  };
};

export const buildMediaPlayerArtworkImageCandidates = ({
  channelImages,
  itemImages,
  chapterImageUrl,
  includeChapterImage,
  imageSizeTarget,
  imageSizeComparison = null,
}: BuildMediaPlayerArtworkImageCandidatesParams) => {
  const mergedItemChannel = mergeDTOItemThenChannelImageHeroCandidates(
    itemImages,
    channelImages,
    imageSizeTarget,
    imageSizeComparison ?? null
  );

  if (!includeChapterImage) {
    return mergedItemChannel;
  }

  const chapterCandidate = getTrimmedCandidateUrl(chapterImageUrl);
  if (!chapterCandidate) {
    return mergedItemChannel;
  }

  return prependDistinctImageCandidate(chapterCandidate, mergedItemChannel);
};
