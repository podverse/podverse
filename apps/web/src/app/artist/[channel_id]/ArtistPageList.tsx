'use client';

import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import React from 'react';
import { useArtistPageContext } from './ArtistPageContext';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListAlbumsRemoteItems } from '../../../components/List/Music/Albums/ListAlbumsRemoteItems';
import { ListTracksRemoteItems } from '../../../components/List/Music/Albums/Tracks/ListTracksRemoteItems';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';

type ArtistPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
  ssrChannelsAdded: DTOChannel[];
  ssrChannelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  ssrItemsAdded: DTOItem[];
  ssrItemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
};

export const ArtistPageList: React.FC<ArtistPageListProps> = ({
  podroll,
  ssrChannel,
  ssrChannelsAdded,
  ssrChannelsUnadded,
  ssrItemsAdded,
  ssrItemsUnadded,
}) => {
  const { filterParams } = useArtistPageContext();
  const { type } = filterParams;

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
