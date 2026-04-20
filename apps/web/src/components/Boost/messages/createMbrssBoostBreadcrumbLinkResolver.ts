'use client';

import type { DTOItem } from '@podverse/helpers';
import type { PublicBoostMessage } from '@podverse/v4v-metaboost';

import { getApiRequestService } from '../../../factories/apiRequestService';
import type { BoostBreadcrumbLinkResolver } from './types';

type ResolverParams = {
  channelIdText: string;
  podcastGuid: string | null;
};

const getTotalPages = (count: number, limit: number): number => {
  if (limit <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(count / limit));
};

const findItemIdTextByGuid = async (
  channelIdText: string,
  itemGuid: string
): Promise<string | null> => {
  const api = getApiRequestService();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await api.reqItemGetManyByChannel({
      idOrIdText: channelIdText,
      page,
      sort: 'recent',
      range: null,
    });
    const found = response.data.find((item: DTOItem) => item.guid === itemGuid);
    if (found?.id_text) {
      return found.id_text;
    }
    totalPages = getTotalPages(response.meta.count ?? 0, Math.max(1, response.meta.limit ?? 20));
    page += 1;
  }

  return null;
};

export const createMbrssBoostBreadcrumbLinkResolver = ({
  channelIdText,
  podcastGuid,
}: ResolverParams): BoostBreadcrumbLinkResolver => {
  const itemHrefCache = new Map<string, string | null>();
  const itemPendingMap = new Map<string, Promise<string | null>>();

  return async (message: PublicBoostMessage): Promise<string | null> => {
    const context = message.breadcrumbContext;
    if (context?.isSubBucket !== true) {
      return null;
    }

    const contextItemGuid = context.itemGuid;
    if (contextItemGuid !== null && contextItemGuid !== '') {
      const cached = itemHrefCache.get(contextItemGuid);
      if (cached !== undefined) {
        return cached;
      }
      const pending = itemPendingMap.get(contextItemGuid);
      if (pending !== undefined) {
        return pending;
      }

      const pendingRequest = (async () => {
        const idText = await findItemIdTextByGuid(channelIdText, contextItemGuid);
        const href = idText ? `/episode/${idText}` : null;
        itemHrefCache.set(contextItemGuid, href);
        itemPendingMap.delete(contextItemGuid);
        return href;
      })();

      itemPendingMap.set(contextItemGuid, pendingRequest);
      return pendingRequest;
    }

    const contextPodcastGuid = context.podcastGuid;
    if (
      contextPodcastGuid !== null &&
      contextPodcastGuid !== '' &&
      podcastGuid !== null &&
      contextPodcastGuid === podcastGuid
    ) {
      return `/podcast/${channelIdText}`;
    }

    return null;
  };
};
