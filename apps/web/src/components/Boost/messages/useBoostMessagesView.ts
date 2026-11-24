'use client';

import { useMemo } from 'react';

import type { DTOChannel } from '@podverse/helpers';
import type {
  PublicBoostMessagesPageFetcher,
  PublicBoostMessagesScopeType,
} from '@podverse/v4v-metaboost';
import {
  createPublicBoostMessagesPageFetcher,
  getBoostEligibilityForContent,
} from '@podverse/v4v-metaboost';

import { useModals } from '../../../contexts/Modals';
import { useMbrssV1BoostCapability } from '../hooks/useMbrssV1BoostCapability';
import { createMbrssBoostBreadcrumbLinkResolver } from './createMbrssBoostBreadcrumbLinkResolver';
import type { BoostBreadcrumbLinkResolver } from './types';

type UseBoostMessagesViewParams = {
  channel: DTOChannel | null;
  itemGuid?: string | null;
  scopeType: PublicBoostMessagesScopeType;
  channelIdText: string | null;
  ssrCanShowBoosts?: boolean;
  resolveChannelHref?: (channelIdText: string) => string;
  resolveItemIdTextByGuid?: (itemGuid: string) => Promise<string | null> | string | null;
  resolveItemHref?: (itemIdText: string) => string;
};

type UseBoostMessagesViewResult = {
  canShowBoostTab: boolean;
  boostsPageFetcher: PublicBoostMessagesPageFetcher | null;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  refreshTrigger: number;
};

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
    return createPublicBoostMessagesPageFetcher({
      fetchAllowed: ssrCanShowBoosts,
      metaBoost: resolvedMetaBoost,
      messagesScope: mbrssMessagesScope,
      capabilityStatus,
      publicMessagesUrl,
      scopeType,
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
