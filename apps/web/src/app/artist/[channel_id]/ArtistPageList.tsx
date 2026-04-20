'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListAlbumsRemoteItems } from '../../../components/List/Music/Albums/ListAlbumsRemoteItems';
import { ListTracksRemoteItems } from '../../../components/List/Music/Albums/Tracks/ListTracksRemoteItems';
import { useArtistPageContext } from './ArtistPageContext';

type ArtistPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
  ssrChannelsAdded: DTOChannel[];
  ssrChannelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  ssrItemsAdded: DTOItem[];
  ssrItemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
  ssrCanShowBoosts: boolean;
};

export const ArtistPageList: React.FC<ArtistPageListProps> = ({
  podroll,
  ssrChannel,
  ssrChannelsAdded,
  ssrChannelsUnadded,
  ssrItemsAdded,
  ssrItemsUnadded,
  ssrCanShowBoosts,
}) => {
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams } = useArtistPageContext();
  const { type } = filterParams;
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    scopeType: 'artist',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
    resolveChannelHref: (channelIdText) => `/artist/${channelIdText}`,
    resolveItemHref: (itemIdText) => `/track/${itemIdText}`,
  });

  return (
    <DetailListWrapper>
      {type === 'albums' && (
        <ListAlbumsRemoteItems
          channelsAdded={ssrChannelsAdded}
          channelsUnadded={ssrChannelsUnadded}
          viewSelected="rows"
        />
      )}
      {type === 'tracks' && (
        <ListTracksRemoteItems
          itemsAdded={ssrItemsAdded}
          itemsUnadded={ssrItemsUnadded}
          viewSelected="rows"
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
    </DetailListWrapper>
  );
};
