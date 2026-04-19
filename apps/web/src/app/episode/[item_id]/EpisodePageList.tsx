'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';
import { useMemo } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { resolveMetaBoostFromApiValueMetadata } from '@podverse/v4v-metaboost';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { createMbrssBoostBreadcrumbLinkResolver } from '../../../components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver';
import { createBoostMessagesPageFetcher } from '../../../components/Boost/messages/fetchPublicBoostMessages';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListItemChapters } from '../../../components/List/ItemChapters/ListItemChapters';
import { ListItemSoundbites } from '../../../components/List/ItemSoundbites/ListItemSoundbites';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useEpisodePageContext } from './EpisodePageContext';

const ItemTranscript = dynamic(
  () =>
    import('../../../components/ItemTranscript/ItemTranscript').then((m) => ({
      default: m.ItemTranscript,
    })),
  {
    ssr: false,
    loading: () => <div aria-label="Loading transcript" style={{ minHeight: 400 }} />,
  }
);

type EpisodePageListProps = {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
};

export const EpisodePageList: React.FC<EpisodePageListProps> = ({ ssrChannel, ssrItem }) => {
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const {
    filterParams,
    setFilterParams,
    isLoading,
    clips,
    itemChapters,
    itemSoundbites,
    totalPages,
    transcriptRows,
    autoScrollOn,
  } = useEpisodePageContext();
  const { page, type } = filterParams;
  const resolvedMetaBoost = useMemo(
    () => resolveMetaBoostFromApiValueMetadata(ssrChannel.channel_meta_boost),
    [ssrChannel.channel_meta_boost]
  );
  const boostsPageFetcher = useMemo(() => {
    if (resolvedMetaBoost?.metaBoost.standard !== 'mbrss-v1') {
      return null;
    }
    const itemGuid = ssrItem.guid;
    if (!itemGuid) {
      return null;
    }
    return createBoostMessagesPageFetcher({
      type: 'mbrss-v1',
      metaBoost: resolvedMetaBoost.metaBoost,
      scope: { type: 'item', itemGuid },
    });
  }, [resolvedMetaBoost, ssrItem.guid]);
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
      {type === 'summary' && <CoreEpisodeSummary description={ssrItem.item_description?.value} />}
      {type === 'chapters' && (
        <ListItemChapters
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          item_chapters={itemChapters}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
        />
      )}
      {type === 'soundbites' && (
        <ListItemSoundbites
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          itemSoundbites={itemSoundbites}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
          showSubscribeMessage={false}
        />
      )}
      {type === 'clips' && (
        <ListClips
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          clips={clips}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
          showSubscribeMessage={false}
        />
      )}
      {type === 'boosts' && boostsPageFetcher !== null && (
        <BoostMessagesSection
          heading={tV4VBoostMessages('title')}
          pageFetcher={boostsPageFetcher}
          breadcrumbLinkResolver={breadcrumbLinkResolver}
        />
      )}
      {type === 'transcript' && (
        <ItemTranscript autoScrollOn={autoScrollOn} rows={transcriptRows} />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
