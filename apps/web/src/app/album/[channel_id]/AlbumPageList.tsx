'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';
import { buildAlbumPath, buildTrackPath, isDescriptionTruncated } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPeopleRows } from '../../../components/Content/About/ContentPeopleRows';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { ContentRemoteItems } from '../../../components/Content/RemoteItems/ContentRemoteItems';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListTracks } from '../../../components/List/Music/Albums/Tracks/ListTracks';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useAlbumPageContext } from './AlbumPageContext';

type AlbumPageListProps = {
  podroll: RemoteItemsResponse | null;
  remoteItems: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
  ssrCanShowBoosts: boolean;
};

export const AlbumPageList: React.FC<AlbumPageListProps> = ({
  podroll,
  remoteItems,
  ssrChannel,
  ssrCanShowBoosts,
}) => {
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams, setFilterParams, items, totalPages, isLoading } = useAlbumPageContext();
  const { page, type } = filterParams;
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    scopeType: 'album',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
    resolveChannelHref: buildAlbumPath,
    resolveItemHref: buildTrackPath,
  });

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
          isTruncated={isDescriptionTruncated(ssrChannel.channel_description)}
          fullDescriptionUrl={ssrChannel.channel_about?.website_link_url}
        />
      )}
      {type === 'people' && <ContentPeopleRows channel_persons={ssrChannel.channel_persons} />}
      {type === 'boosts' && boostsPageFetcher !== null && (
        <BoostMessagesSection
          heading={tV4VBoostMessages('title')}
          pageFetcher={boostsPageFetcher}
          breadcrumbLinkResolver={breadcrumbLinkResolver}
          refreshTrigger={refreshTrigger}
        />
      )}
      {type === 'podroll' && <ContentPodroll remoteItemsResponse={podroll} />}
      {type === 'remote-items' && <ContentRemoteItems remoteItemsResponse={remoteItems} />}
      {type === 'settings' && <ListChannelSettings channel={ssrChannel} />}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
