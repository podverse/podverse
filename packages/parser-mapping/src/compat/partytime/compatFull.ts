import type { FeedObject } from '../../types/partytime.js';
import type { CompatLiveItemDto } from './liveItem.js';
import {
  compatChannelAboutDto,
  compatChannelCategoryDtos,
  compatChannelChatDto,
  compatChannelDescriptionDto,
  compatChannelDto,
  compatChannelFundingDtos,
  compatChannelImageDtos,
  compatChannelLicenseDto,
  compatChannelLocationDto,
  compatChannelPersonDtos,
  compatChannelPodrollRemoteItemDtos,
  compatChannelPublisherRemoteItemDtos,
  compatChannelRemoteItemDtos,
  compatChannelSeasonDtos,
  compatChannelSocialInteractDtos,
  compatChannelTrailerDtos,
  compatChannelTxtDtos,
  compatChannelValueDtos,
} from './channel.js';
import {
  compatItemAboutDto,
  compatItemChatDto,
  compatItemChaptersFeedDto,
  compatItemDescriptionDto,
  compatItemDto,
  compatItemEnclosureDtos,
  compatItemImageDtos,
  compatItemLicenseDto,
  compatItemLocationDto,
  compatItemPersonDtos,
  compatItemSeasonDto,
  compatItemSeasonEpisodeDto,
  compatItemSocialInteractDtos,
  compatItemSoundbiteDtos,
  compatItemTranscriptDtos,
  compatItemTxtDtos,
  compatItemValueDtos,
} from './item.js';
import { compatLiveItemsDtos } from './liveItem.js';

export type ParsedRSSFeedCompatBundle = {
  channel: {
    channel: ReturnType<typeof compatChannelDto>;
    about: ReturnType<typeof compatChannelAboutDto> | null;
    categories: ReturnType<typeof compatChannelCategoryDtos>;
    chat: ReturnType<typeof compatChannelChatDto> | null;
    description: ReturnType<typeof compatChannelDescriptionDto> | null;
    funding: ReturnType<typeof compatChannelFundingDtos>;
    images: ReturnType<typeof compatChannelImageDtos>;
    license: ReturnType<typeof compatChannelLicenseDto> | null;
    location: ReturnType<typeof compatChannelLocationDto> | null;
    people: ReturnType<typeof compatChannelPersonDtos>;
    podrollRemoteItems: ReturnType<typeof compatChannelPodrollRemoteItemDtos>;
    publisherRemoteItems: ReturnType<typeof compatChannelPublisherRemoteItemDtos>;
    remoteItems: ReturnType<typeof compatChannelRemoteItemDtos>;
    socialInteract: ReturnType<typeof compatChannelSocialInteractDtos>;
    seasons: ReturnType<typeof compatChannelSeasonDtos>;
    trailers: ReturnType<typeof compatChannelTrailerDtos>;
    txt: ReturnType<typeof compatChannelTxtDtos>;
    value: ReturnType<typeof compatChannelValueDtos>;
  };
  items: Array<{
    item: ReturnType<typeof compatItemDto>;
    about: ReturnType<typeof compatItemAboutDto>;
    chaptersFeed: ReturnType<typeof compatItemChaptersFeedDto> | null;
    chat: ReturnType<typeof compatItemChatDto> | null;
    description: ReturnType<typeof compatItemDescriptionDto> | null;
    enclosures: ReturnType<typeof compatItemEnclosureDtos>;
    images: ReturnType<typeof compatItemImageDtos>;
    license: ReturnType<typeof compatItemLicenseDto> | null;
    location: ReturnType<typeof compatItemLocationDto> | null;
    people: ReturnType<typeof compatItemPersonDtos>;
    season: ReturnType<typeof compatItemSeasonDto> | null;
    seasonEpisode: ReturnType<typeof compatItemSeasonEpisodeDto> | null;
    socialInteract: ReturnType<typeof compatItemSocialInteractDtos>;
    soundbites: ReturnType<typeof compatItemSoundbiteDtos>;
    transcripts: ReturnType<typeof compatItemTranscriptDtos>;
    txt: ReturnType<typeof compatItemTxtDtos>;
    value: ReturnType<typeof compatItemValueDtos>;
  }>;
  liveItems: CompatLiveItemDto[];
};

export const convertParsedRSSFeedToCompat = (parsedFeed: FeedObject): ParsedRSSFeedCompatBundle => {
  const items = (parsedFeed.items ?? []).map((item) => ({
    item: compatItemDto(item),
    about: compatItemAboutDto(item),
    chaptersFeed: compatItemChaptersFeedDto(item),
    chat: compatItemChatDto(item),
    description: compatItemDescriptionDto(item),
    enclosures: compatItemEnclosureDtos(item),
    images: compatItemImageDtos(item),
    license: compatItemLicenseDto(item),
    location: compatItemLocationDto(item),
    people: compatItemPersonDtos(item),
    season: compatItemSeasonDto(item),
    seasonEpisode: compatItemSeasonEpisodeDto(item),
    socialInteract: compatItemSocialInteractDtos(item),
    soundbites: compatItemSoundbiteDtos(item),
    transcripts: compatItemTranscriptDtos(item),
    txt: compatItemTxtDtos(item),
    value: compatItemValueDtos(item),
  }));

  const liveItems = parsedFeed.podcastLiveItems
    ? compatLiveItemsDtos(parsedFeed.podcastLiveItems)
    : [];

  return {
    channel: {
      channel: compatChannelDto(parsedFeed),
      about: compatChannelAboutDto(parsedFeed),
      categories: compatChannelCategoryDtos(parsedFeed),
      chat: compatChannelChatDto(parsedFeed),
      description: compatChannelDescriptionDto(parsedFeed),
      funding: compatChannelFundingDtos(parsedFeed),
      images: compatChannelImageDtos(parsedFeed),
      license: compatChannelLicenseDto(parsedFeed),
      location: compatChannelLocationDto(parsedFeed),
      people: compatChannelPersonDtos(parsedFeed),
      podrollRemoteItems: compatChannelPodrollRemoteItemDtos(parsedFeed),
      publisherRemoteItems: compatChannelPublisherRemoteItemDtos(parsedFeed),
      remoteItems: compatChannelRemoteItemDtos(parsedFeed),
      socialInteract: compatChannelSocialInteractDtos(parsedFeed),
      seasons: compatChannelSeasonDtos(parsedFeed),
      trailers: compatChannelTrailerDtos(parsedFeed),
      txt: compatChannelTxtDtos(parsedFeed),
      value: compatChannelValueDtos(parsedFeed),
    },
    items,
    liveItems,
  };
};
