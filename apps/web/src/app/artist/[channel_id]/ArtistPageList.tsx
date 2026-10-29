'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  DTOChannel,
  DTOItem,
  DTORemoteChannelStub,
  RemoteItemsResponse,
} from '@podverse/helpers';
import { buildArtistPath, buildTrackPath, isDescriptionTruncated } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentAbout } from '../../../components/Content/About/ContentAbout';
import { ContentPeopleRows } from '../../../components/Content/About/ContentPeopleRows';
import { ContentPodroll } from '../../../components/Content/Podroll/ContentPodroll';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListChannelSettings } from '../../../components/List/ListChannelSettings';
import { ListTracksRemoteItems } from '../../../components/List/Music/Albums/Tracks/ListTracksRemoteItems';
import { ArtistPageYourAddByRssTracks } from './ArtistPageAddByRssSections';
import { ArtistPageAlbumSections } from './ArtistPageAlbumSections';
import { useArtistPageContext } from './ArtistPageContext';

type ArtistPageListProps = {
  podroll: RemoteItemsResponse | null;
  ssrChannel: DTOChannel;
  ssrChannelsAdded: DTOChannel[];
  ssrChannelsUnadded: DTORemoteChannelStub[];
  ssrItemsAdded: DTOItem[];
  ssrCanShowBoosts: boolean;
};

export const ArtistPageList: React.FC<ArtistPageListProps> = ({
  podroll,
  ssrChannel,
  ssrChannelsAdded,
  ssrChannelsUnadded,
  ssrItemsAdded,
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
    resolveChannelHref: buildArtistPath,
    resolveItemHref: buildTrackPath,
  });

  return (
    <DetailListWrapper>
      {type === 'albums' && (
        <ArtistPageAlbumSections
          channel={ssrChannel}
          channelsAdded={ssrChannelsAdded}
          channelsUnadded={ssrChannelsUnadded}
        />
      )}
      {type === 'tracks' && (
        <>
          <ListTracksRemoteItems itemsAdded={ssrItemsAdded} viewSelected="rows" />
          <ArtistPageYourAddByRssTracks channel={ssrChannel} />
        </>
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
          isTruncated={isDescriptionTruncated(ssrChannel.channel_description)}
          fullDescriptionUrl={ssrChannel.channel_about?.website_link_url}
        />
      )}
      {type === 'people' && <ContentPeopleRows channel_persons={ssrChannel.channel_persons} />}
      {type === 'podroll' && <ContentPodroll remoteItemsResponse={podroll} />}
      {type === 'settings' && <ListChannelSettings channel={ssrChannel} />}
    </DetailListWrapper>
  );
};
