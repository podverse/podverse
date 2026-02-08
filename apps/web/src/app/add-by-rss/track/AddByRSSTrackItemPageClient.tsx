'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { TranscriptRow } from '@podverse/helpers';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { NoResults } from '../../../components/NoResults/NoResults';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { Tabs } from '../../../components/Tabs/Tabs';
import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSTrackDetailHeader } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackDetailHeader';
import { useAccount } from '../../../contexts/Account';
import { apiRequestService } from '../../../factories/apiRequestService';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import { getAddByRSSFeedByIdText, getAddByRSSItemByIdText } from '../../../utils/addByRSS/storage';
import {
  getCachedChaptersTranscript,
  getChaptersAndTranscriptUrls,
  setCachedChaptersTranscript,
} from '../../../utils/addByRSS/chaptersTranscript';
import type { AddByRSSFeedRecord, AddByRSSItemIndexItem } from '../../../utils/addByRSS/types';
import { getTranscriptRowsFromTranscriptString } from '../../../utils/transcript';

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

type AddByRSSTrackItemPageClientProps = {
  itemIdText: string;
};

export const AddByRSSTrackItemPageClient: React.FC<AddByRSSTrackItemPageClientProps> = ({
  itemIdText,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [track, setTrack] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTab, setSelectedTab] = React.useState<'summary' | 'transcript'>('summary');
  const [transcriptRows, setTranscriptRows] = React.useState<TranscriptRow[]>([]);
  const [transcriptLoading, setTranscriptLoading] = React.useState(false);
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null);

  const transcriptUrl = React.useMemo(() => {
    if (!track) return undefined;
    return getChaptersAndTranscriptUrls(track.bundle).transcriptUrl;
  }, [track]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!itemIdText) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      if (!loggedInAccount) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
      if (cancelled) {
        return;
      }

      const found = await getAddByRSSItemByIdText(itemIdText);
      if (cancelled) {
        return;
      }

      if (!found) {
        setTrack(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.channelIdText);
      if (cancelled) {
        return;
      }

      setTrack(found);
      setFeed(feedRecord);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [itemIdText, loggedInAccount]);

  React.useEffect(() => {
    if (!track || !transcriptUrl || selectedTab !== 'transcript') return;

    let cancelled = false;
    setTranscriptError(null);
    setTranscriptLoading(true);
    setTranscriptRows([]);

    const load = async () => {
      const cached = getCachedChaptersTranscript(track.idText);
      if (cached) {
        if (
          cached.transcriptText !== null &&
          cached.transcriptText !== undefined &&
          cached.transcriptText !== ''
        ) {
          const rows = await getTranscriptRowsFromTranscriptString(cached.transcriptText);
          if (!cancelled) setTranscriptRows(rows);
        }
        if (!cancelled) setTranscriptLoading(false);
        return;
      }
      try {
        const res = await apiRequestService.reqAccountAddByRSSChaptersTranscript({
          itemIdText: track.idText,
          transcriptUrl,
          feedUrl: feed?.feedUrl,
        });
        if (cancelled) return;
        setCachedChaptersTranscript(track.idText, {
          chapters: res.chapters ?? [],
          transcriptText: res.transcriptText,
        });
        if (
          res.transcriptText !== null &&
          res.transcriptText !== undefined &&
          res.transcriptText !== ''
        ) {
          const rows = await getTranscriptRowsFromTranscriptString(res.transcriptText);
          if (!cancelled) setTranscriptRows(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setTranscriptError(err instanceof Error ? err.message : tMisc('error_occurred'));
        }
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [track, feed, selectedTab, transcriptUrl, tMisc]);

  if (isLoading) {
    return <LoadingSpinnerOverlay isLoading message={tMisc('loading_your_content')} />;
  }

  if (!track || !feed) {
    return (
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    );
  }

  const title = track.bundle.item.title ?? tInfo('track.track');
  const description = track.bundle.description?.value ?? null;

  const tabData = React.useMemo(() => {
    const tabs: Array<{
      key: 'summary' | 'transcript';
      label: string;
      onClick: () => void;
      zIndex: number;
    }> = [
      {
        key: 'summary',
        label: tInfo('summary.summary'),
        onClick: () => setSelectedTab('summary'),
        zIndex: 1,
      },
    ];
    if (transcriptUrl) {
      tabs.push({
        key: 'transcript',
        label: tInfo('transcript.lyrics'),
        onClick: () => setSelectedTab('transcript'),
        zIndex: 2,
      });
    }
    return tabs;
  }, [transcriptUrl, tInfo]);

  return (
    <MainWrapper>
      <AddByRSSAlbumHeader feed={feed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSTrackDetailHeader itemIdText={track.idText} title={title} indexItem={track} />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={selectedTab} />} />
          <DetailListWrapper>
            {selectedTab === 'summary' &&
              (description ? <CoreEpisodeSummary description={description} /> : null)}
            {selectedTab === 'transcript' && (
              <>
                {transcriptError ? (
                  <NoResults message={transcriptError} />
                ) : (
                  <ItemTranscript autoScrollOn={false} rows={transcriptRows} />
                )}
                <LoadingSpinnerOverlay isLoading={transcriptLoading} />
              </>
            )}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
