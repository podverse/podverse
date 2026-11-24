'use client';

import type { DTOItem } from '@podverse/helpers';
import { buildEpisodePath, buildPodcastPath } from '@podverse/helpers';
import type { PublicBoostMessage } from '@podverse/v4v-metaboost';
import { resolvePublicBoostBreadcrumbTarget } from '@podverse/v4v-metaboost';

import { getApiRequestService } from '../../../factories/apiRequestService';
import type { BoostBreadcrumbLinkResolver } from './types';

type ResolverParams = {
  channelIdText: string;
  podcastGuid: string | null;
  resolveChannelHref?: (channelIdText: string) => string;
  resolveItemIdTextByGuid?: (itemGuid: string) => Promise<string | null> | string | null;
  resolveItemHref?: (itemIdText: string) => string;
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
  resolveChannelHref = (resolvedChannelIdText) => buildPodcastPath(resolvedChannelIdText),
  resolveItemIdTextByGuid,
  resolveItemHref = (resolvedItemIdText) => buildEpisodePath(resolvedItemIdText),
}: ResolverParams): BoostBreadcrumbLinkResolver => {
  const itemHrefCache = new Map<string, string | null>();
  const itemPendingMap = new Map<string, Promise<string | null>>();

  return async (message: PublicBoostMessage): Promise<string | null> => {
    const target = resolvePublicBoostBreadcrumbTarget(message, podcastGuid);
    if (target.kind === 'none') {
      return null;
    }

    if (target.kind === 'channel') {
      return resolveChannelHref(channelIdText);
    }

    const contextItemGuid = target.itemGuid;
    const cached = itemHrefCache.get(contextItemGuid);
    if (cached !== undefined) {
      return cached;
    }
    const pending = itemPendingMap.get(contextItemGuid);
    if (pending !== undefined) {
      return pending;
    }

    const pendingRequest = (async () => {
      const resolvedItemIdText = resolveItemIdTextByGuid
        ? await resolveItemIdTextByGuid(contextItemGuid)
        : await findItemIdTextByGuid(channelIdText, contextItemGuid);
      const idText = resolvedItemIdText ?? null;
      const href = idText ? resolveItemHref(idText) : null;
      itemHrefCache.set(contextItemGuid, href);
      itemPendingMap.delete(contextItemGuid);
      return href;
    })();

    itemPendingMap.set(contextItemGuid, pendingRequest);
    return pendingRequest;
  };
};
