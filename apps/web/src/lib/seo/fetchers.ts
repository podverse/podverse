import { cache } from 'react';

import type { PodcastByIdFeed } from '@podverse/helpers';
import {
  findDTOChannelImageForHero,
  mergeDTOItemThenChannelImageHeroCandidates,
} from '@podverse/helpers';

import { getSSRAuthService } from '../../utils/auth/ssrAuth';

const getSsrApiRequestService = cache(async () => {
  const { ssrApiRequestService } = await getSSRAuthService();
  return ssrApiRequestService;
});

export const getChannelForSeoPage = cache(async (idOrIdText: string | number) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqChannelGetByIdOrIdText(idOrIdText);
});

export const getItemForSeoPage = cache(async (idOrIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqItemGetByIdOrIdText(idOrIdText);
});

export const getPodcastIndexFeedForSeoPage = cache(async (podcastIndexId: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqPodcastIndexFeedById(podcastIndexId);
});

export const getInternalFeedForSeoPage = cache(async (podcastIndexId: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqFeedGetByPodcastIndexId(podcastIndexId);
});

export const getChannelByPodcastIndexIdForSeoPage = cache(async (podcastIndexId: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqChannelGetByPodcastIndexId(podcastIndexId);
});

export const getPublisherRemoteItemsForChannelSeoPage = cache(async (idOrIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqPublisherFeedGetRemoteItemsForChannel(idOrIdText);
});

export const getClipForSeoPage = cache(async (clipIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqClipGet(clipIdText);
});

export const getItemChapterForSeoPage = cache(async (itemChapterIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqItemChapterGetByIdText(itemChapterIdText);
});

export const getItemSoundbiteForSeoPage = cache(async (itemSoundbiteIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqItemSoundbiteGet(itemSoundbiteIdText);
});

export const getAccountForSeoPage = cache(async (idText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqAccountGetByIdText({ id_text: idText });
});

export const getPlaylistForSeoPage = cache(async (playlistIdText: string) => {
  const ssrApiRequestService = await getSsrApiRequestService();
  return ssrApiRequestService.reqPlaylistGet(playlistIdText);
});

const findFirstAbsoluteImageUrl = (urls: string[]): string | undefined => {
  return urls.find((url) => /^https?:\/\//i.test(url));
};

export const getChannelHeroImageUrl = (
  channelImages: Parameters<typeof findDTOChannelImageForHero>[0]
) => {
  return findDTOChannelImageForHero(channelImages, 'largest', null)?.url;
};

export const getItemThenChannelHeroImageUrl = (
  itemImages: Parameters<typeof mergeDTOItemThenChannelImageHeroCandidates>[0],
  channelImages: Parameters<typeof mergeDTOItemThenChannelImageHeroCandidates>[1]
) => {
  const candidates = mergeDTOItemThenChannelImageHeroCandidates(
    itemImages,
    channelImages,
    'largest',
    null
  );
  return findFirstAbsoluteImageUrl(candidates) ?? candidates[0];
};

export const getPodcastIndexFeedHeroImageUrl = (feed: PodcastByIdFeed) => {
  return feed.image || feed.artwork || undefined;
};
