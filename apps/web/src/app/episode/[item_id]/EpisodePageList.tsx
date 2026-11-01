'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { isDescriptionTruncated } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentPeopleRows } from '../../../components/Content/About/ContentPeopleRows';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { ListClips } from '../../../components/List/Clips/ListClips';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListItemChapters } from '../../../components/List/ItemChapters/ListItemChapters';
import { ListItemSoundbites } from '../../../components/List/ItemSoundbites/ListItemSoundbites';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { useDescriptionClockPlayback } from '../../../hooks/useDescriptionClockPlayback';
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
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
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
  } = useEpisodePageContext();
  const { page, type } = filterParams;
  const clock = useDescriptionClockPlayback({
    channel: ssrChannel,
    item: ssrItem,
    kind: 'item',
  });
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    itemGuid: ssrItem.guid ?? null,
    scopeType: 'item',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
  });

  return (
    <DetailListWrapper fill={type === 'transcript'}>
      {type === 'summary' && (
        <CoreEpisodeSummary
          description={ssrItem.item_description?.value}
          descriptionClockLabel={clock.descriptionClockLabel}
          onDescriptionClock={clock.onDescriptionClock}
          isTruncated={isDescriptionTruncated(ssrItem.item_description)}
          fullNotesUrl={ssrItem.item_about?.website_link_url}
        />
      )}
      {type === 'people' && <ContentPeopleRows item_persons={ssrItem.item_persons} />}
      {type === 'chapters' && (
        <ListItemChapters
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          item_chapters={itemChapters}
          channel={ssrChannel}
          item={ssrItem}
          totalPages={totalPages}
          emptyMessage={tInfo('chapter.no_chapters')}
          isLoading={isLoading}
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
          emptyMessage={tInfo('soundbite.no_official_clips_found')}
          isLoading={isLoading}
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
          emptyMessage={tFeatures('clip.no_clips_found')}
          isLoading={isLoading}
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
      {type === 'transcript' && !isLoading && transcriptRows.length === 0 ? (
        <NoResults message={tInfo('transcript.no_transcript')} role="status" />
      ) : null}
      {type === 'transcript' && (isLoading || transcriptRows.length > 0) ? (
        <ItemTranscript rows={transcriptRows} />
      ) : null}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </DetailListWrapper>
  );
};
