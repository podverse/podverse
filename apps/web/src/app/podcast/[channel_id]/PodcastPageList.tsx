'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { useMemo } from 'react';

import type { DTOChannel, RemoteItemsResponse } from '@podverse/helpers';
import { resolveMetaBoostFromApiValueMetadata } from '@podverse/v4v-metaboost';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { createMbrssBoostBreadcrumbLinkResolver } from '../../../components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver';
import { createBoostMessagesPageFetcher } from '../../../components/Boost/messages/fetchPublicBoostMessages';
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
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams, setFilterParams, items, itemSoundbites, clips, totalPages, isLoading } =
    usePodcastPageContext();
  const { page } = filterParams;

  const { type } = filterParams;
  const resolvedMetaBoost = useMemo(
    () => resolveMetaBoostFromApiValueMetadata(ssrChannel.channel_meta_boost),
    [ssrChannel.channel_meta_boost]
  );
  const boostsPageFetcher = useMemo(() => {
    if (resolvedMetaBoost?.metaBoost.standard !== 'mbrss-v1') {
      return null;
    }
    const podcastGuid = ssrChannel.podcast_guid;
    if (!podcastGuid) {
      return null;
    }
    return createBoostMessagesPageFetcher({
      type: 'mbrss-v1',
      metaBoost: resolvedMetaBoost.metaBoost,
      scope: { type: 'channel', podcastGuid },
    });
  }, [resolvedMetaBoost, ssrChannel.podcast_guid]);
  const breadcrumbLinkResolver = useMemo(() => {
    if (!ssrChannel.id_text) {
      return undefined;
    }
    return createMbrssBoostBreadcrumbLinkResolver({
      channelIdText: ssrChannel.id_text,
      podcastGuid: ssrChannel.podcast_guid ?? null,
    });
  }, [ssrChannel.id_text, ssrChannel.podcast_guid]);

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
