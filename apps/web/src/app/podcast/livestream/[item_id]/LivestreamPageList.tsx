'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../../components/Boost/messages/useBoostMessagesView';
import { CoreEpisodeSummary } from '../../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../../components/List/DetailListWrapper';
import { WebLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useLivestreamPageContext } from './LivestreamPageContext';

type LivestreamPageListProps = {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  medium: QueryParamsQueueMedium;
  ssrCanShowBoosts: boolean;
};

export const LivestreamPageList: React.FC<LivestreamPageListProps> = ({
  ssrChannel,
  ssrItem,
  medium,
  ssrCanShowBoosts,
}) => {
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams, isLoading } = useLivestreamPageContext();
  const { type } = filterParams;
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    itemGuid: ssrItem.guid ?? null,
    scopeType: 'livestream',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
    resolveChannelHref: (channelIdText) =>
      medium === 'music' ? `/artist/${channelIdText}` : `/podcast/${channelIdText}`,
    resolveItemHref: (itemIdText) =>
      medium === 'music' ? `/music/livestream/${itemIdText}` : `/podcast/livestream/${itemIdText}`,
  });

  return (
    <DetailListWrapper>
      {type === 'summary' && <CoreEpisodeSummary description={ssrItem.item_description?.value} />}
      {type === 'boosts' && boostsPageFetcher !== null && (
        <BoostMessagesSection
          heading={tV4VBoostMessages('title')}
          pageFetcher={boostsPageFetcher}
          breadcrumbLinkResolver={breadcrumbLinkResolver}
          refreshTrigger={refreshTrigger}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
