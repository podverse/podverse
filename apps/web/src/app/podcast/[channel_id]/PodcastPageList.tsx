'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListItemSoundbites } from '../../../components/List/ItemSoundbites/ListItemSoundbites';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListEpisodes } from '../../../components/List/Podcasts/Episodes/ListEpisodes';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { usePodcastPageContext } from './PodcastPageContext';

type PodcastPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
  ssrCanShowBoosts: boolean;
};

export const PodcastPageList: React.FC<PodcastPageListProps> = ({
  podroll,
  ssrChannel,
  ssrCanShowBoosts,
}) => {
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams, setFilterParams, items, itemSoundbites, clips, totalPages, isLoading } =
    usePodcastPageContext();
  const { page } = filterParams;

  const { type } = filterParams;
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    scopeType: 'channel',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
  });

  return (
    <DetailListWrapper>
      {type === 'episodes' && (
        <ListEpisodes
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          channel={ssrChannel}
          items={items}
          totalPages={totalPages}
          viewSelected="rows"
        />
      )}
      {type === 'soundbites' && (
        <ListItemSoundbites
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          channel={ssrChannel}
          item={null}
          itemSoundbites={itemSoundbites}
          totalPages={totalPages}
          showItemInfo
        />
      )}
      {type === 'clips' && (
        <ListClips
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          clips={clips}
          channel={ssrChannel}
          totalPages={totalPages}
          showItemInfo
        />
      )}
      {type === 'boosts' && boostsPageFetcher !== null && (
        <BoostMessagesSection
          heading={tV4VBoostMessages('title')}
          pageFetcher={boostsPageFetcher}
          breadcrumbLinkResolver={breadcrumbLinkResolver}
          refreshTrigger={refreshTrigger}
        />
      )}
      {type === 'about' && (
        <ContentAbout
          description={ssrChannel.channel_description?.value}
          channel_persons={ssrChannel.channel_persons}
        />
      )}
      {type === 'podroll' && <ContentPodroll remoteItemsResponse={podroll} />}
      {type === 'settings' && <ListChannelSettings channel={ssrChannel} />}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
