'use client';

import React from 'react';

import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';

import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListItemSoundbites } from '../../../components/List/ItemSoundbites/ListItemSoundbites';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListEpisodes } from '../../../components/List/Podcasts/Episodes/ListEpisodes';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { usePodcastPageContext } from './PodcastPageContext';

type PodcastPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
};

export const PodcastPageList: React.FC<PodcastPageListProps> = ({ podroll, ssrChannel }) => {
  const { filterParams, setFilterParams, items, itemSoundbites, clips, totalPages, isLoading } =
    usePodcastPageContext();
  const { page } = filterParams;

  const { type } = filterParams;

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
