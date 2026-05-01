'use client';

import { useMemo } from 'react';

import type { DTOChannel } from '@podverse/helpers';

import { useModals } from '../../../contexts/Modals';
import { getBoostEligibilityForContent } from '../../../utils/value/boostEligibility';
import { useMbrssV1BoostCapability } from '../hooks/useMbrssV1BoostCapability';
import { createMbrssBoostBreadcrumbLinkResolver } from './createMbrssBoostBreadcrumbLinkResolver';
import { createBoostMessagesPageFetcher } from './fetchPublicBoostMessages';
import type { BoostBreadcrumbLinkResolver, BoostMessagesPageFetcher } from './types';

type ChannelScopeType = 'channel' | 'artist' | 'album';
type ItemScopeType = 'item' | 'track' | 'livestream';
type ScopeType = ChannelScopeType | ItemScopeType;

type UseBoostMessagesViewParams = {
  channel: DTOChannel | null;
  itemGuid?: string | null;
  scopeType: ScopeType;
  channelIdText: string | null;
  ssrCanShowBoosts?: boolean;
  resolveChannelHref?: (channelIdText: string) => string;
  resolveItemIdTextByGuid?: (itemGuid: string) => Promise<string | null> | string | null;
  resolveItemHref?: (itemIdText: string) => string;
};

type UseBoostMessagesViewResult = {
  canShowBoostTab: boolean;
  boostsPageFetcher: BoostMessagesPageFetcher | null;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  refreshTrigger: number;
};

const isChannelScope = (scopeType: ScopeType): scopeType is ChannelScopeType =>
  scopeType === 'channel' || scopeType === 'artist' || scopeType === 'album';

export const useBoostMessagesView = ({
  channel,
  itemGuid = null,
  scopeType,
  channelIdText,
  ssrCanShowBoosts = true,
  resolveChannelHref,
  resolveItemIdTextByGuid,
  resolveItemHref,
}: UseBoostMessagesViewParams): UseBoostMessagesViewResult => {
  const { publicBoostMessagesRefreshTrigger } = useModals();
  const { resolvedMetaBoost, mbrssMessagesScope } = useMemo(
    () =>
      getBoostEligibilityForContent({
        channel,
        itemGuid,
      }),
    [channel, itemGuid]
  );
  const mbrssMetaBoost = resolvedMetaBoost?.standard === 'mbrss-v1' ? resolvedMetaBoost : null;
  const { status: capabilityStatus, publicMessagesUrl } = useMbrssV1BoostCapability(
    mbrssMetaBoost,
    {
      fetchEnabled: ssrCanShowBoosts,
    }
  );

  const boostsPageFetcher = useMemo(() => {
    if (
      !ssrCanShowBoosts ||
      resolvedMetaBoost?.standard !== 'mbrss-v1' ||
      mbrssMessagesScope === null ||
      capabilityStatus !== 'success' ||
      publicMessagesUrl === null
    ) {
      return null;
    }

    if (isChannelScope(scopeType)) {
      if (mbrssMessagesScope.type !== 'channel') {
        return null;
      }

      if (scopeType === 'channel') {
        return createBoostMessagesPageFetcher({
          type: 'mbrss-v1',
          publicMessagesUrl,
          scope: { type: 'channel', podcastGuid: mbrssMessagesScope.podcastGuid },
        });
      }

      return createBoostMessagesPageFetcher({
        type: 'mbrss-v1',
        publicMessagesUrl,
        scope: { type: scopeType, podcastGuid: mbrssMessagesScope.podcastGuid },
      });
    }

    if (mbrssMessagesScope.type !== 'item') {
      return null;
    }

    if (scopeType === 'item') {
      return createBoostMessagesPageFetcher({
        type: 'mbrss-v1',
        publicMessagesUrl,
        scope: { type: 'item', itemGuid: mbrssMessagesScope.itemGuid },
      });
    }

    return createBoostMessagesPageFetcher({
      type: 'mbrss-v1',
      publicMessagesUrl,
      scope: { type: scopeType, itemGuid: mbrssMessagesScope.itemGuid },
    });
  }, [
    capabilityStatus,
    mbrssMessagesScope,
    publicMessagesUrl,
    resolvedMetaBoost,
    scopeType,
    ssrCanShowBoosts,
  ]);

  const breadcrumbLinkResolver = useMemo(() => {
    if (channelIdText === null || channelIdText === '') {
      return undefined;
    }

    return createMbrssBoostBreadcrumbLinkResolver({
      channelIdText,
      podcastGuid: channel?.podcast_guid ?? null,
      resolveChannelHref,
      resolveItemIdTextByGuid,
      resolveItemHref,
    });
  }, [
    channel?.podcast_guid,
    channelIdText,
    resolveChannelHref,
    resolveItemHref,
    resolveItemIdTextByGuid,
  ]);

  return {
    canShowBoostTab: boostsPageFetcher !== null,
    boostsPageFetcher,
    breadcrumbLinkResolver,
    refreshTrigger: publicBoostMessagesRefreshTrigger,
  };
};
