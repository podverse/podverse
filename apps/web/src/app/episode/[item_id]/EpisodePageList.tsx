'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
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
  ssrCanShowBoosts: boolean;
};

export const EpisodePageList: React.FC<EpisodePageListProps> = ({
  ssrChannel,
  ssrItem,
  ssrCanShowBoosts,
}) => {
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
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    itemGuid: ssrItem.guid ?? null,
    scopeType: 'item',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
  });

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
          refreshTrigger={refreshTrigger}
        />
      )}
      {type === 'transcript' && (
        <ItemTranscript autoScrollOn={autoScrollOn} rows={transcriptRows} />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
