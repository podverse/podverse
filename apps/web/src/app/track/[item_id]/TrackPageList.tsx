'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { buildAlbumPath, buildTrackPath, isDescriptionTruncated } from '@podverse/helpers';

import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { ContentPeopleRows } from '../../../components/Content/About/ContentPeopleRows';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { useDescriptionClockPlayback } from '../../../hooks/useDescriptionClockPlayback';
import { useTrackPageContext } from './TrackPageContext';

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

type TrackPageListProps = {
  ssrChannel: DTOChannel;
  ssrItem: DTOItem;
  ssrCanShowBoosts: boolean;
};

export const TrackPageList: React.FC<TrackPageListProps> = ({
  ssrChannel,
  ssrItem,
  ssrCanShowBoosts,
}) => {
  const tInfo = useTranslations('info');
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const { filterParams, isLoading, transcriptRows } = useTrackPageContext();
  const { type } = filterParams;
  const clock = useDescriptionClockPlayback({
    channel: ssrChannel,
    item: ssrItem,
    kind: 'item',
  });
  const { boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } = useBoostMessagesView({
    channel: ssrChannel,
    itemGuid: ssrItem.guid ?? null,
    scopeType: 'track',
    channelIdText: ssrChannel.id_text ?? null,
    ssrCanShowBoosts,
    resolveChannelHref: buildAlbumPath,
    resolveItemHref: buildTrackPath,
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
