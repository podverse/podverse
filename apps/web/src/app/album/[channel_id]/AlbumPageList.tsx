'use client';

import React from 'react';

import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';

import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListTracks } from '../../../components/List/Music/Albums/Tracks/ListTracks';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useAlbumPageContext } from './AlbumPageContext';

type AlbumPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
};

export const AlbumPageList: React.FC<AlbumPageListProps> = ({ podroll, ssrChannel }) => {
  const { filterParams, setFilterParams, items, totalPages, isLoading } = useAlbumPageContext();
  const { page, type } = filterParams;

  return (
    <DetailListWrapper>
      {type === 'tracks' && (
        <ListTracks
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          channel={ssrChannel}
          items={items}
          totalPages={totalPages}
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
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
