'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOItemChapter } from '@podverse/helpers';
import type { TranscriptRow } from '@podverse/helpers';

import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSEpisodeDetailHeader } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListItemChapters } from '../../../components/List/ItemChapters/ListItemChapters';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { SideContent } from '../../../components/SideContent/SideContent';
import { Tabs } from '../../../components/Tabs/Tabs';
import { EVENTS } from '../../../constants/events';
import { useAccount } from '../../../contexts/Account';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { getApiRequestService } from '../../../factories/apiRequestService';
import {
  getCachedChaptersTranscript,
  getChaptersAndTranscriptUrls,
  mapAddByRSSChaptersToDTOItemChapters,
  setCachedChaptersTranscript,
} from '../../../utils/addByRSS/chaptersTranscript';
import { getAddByRSSFeedByIdText, getAddByRSSItemByIdText } from '../../../utils/addByRSS/storage';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
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

type AddByRSSEpisodePageClientProps = {
  itemIdText: string;
};

export const AddByRSSEpisodePageClient: React.FC<AddByRSSEpisodePageClientProps> = ({
  itemIdText,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const { mpAddByRSS, setMPItemChapter, setMPItemChapterShouldSeek } = useMediaPlayer();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [episode, setEpisode] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTab, setSelectedTab] = React.useState<'summary' | 'chapters' | 'transcript'>(
    'summary'
  );
  const [itemChapters, setItemChapters] = React.useState<DTOItemChapter[]>([]);
  const [transcriptRows, setTranscriptRows] = React.useState<TranscriptRow[]>([]);
  const [chaptersTranscriptLoading, setChaptersTranscriptLoading] = React.useState(false);
  const [chaptersTranscriptError, setChaptersTranscriptError] = React.useState<string | null>(null);
  const [chaptersPage, setChaptersPage] = React.useState(1);

  const { chaptersFeedUrl, transcriptUrl } = React.useMemo(() => {
    if (!episode) return { chaptersFeedUrl: undefined, transcriptUrl: undefined };
    return getChaptersAndTranscriptUrls(episode.bundle);
  }, [episode]);

  const hasChaptersOrTranscript = Boolean(chaptersFeedUrl || transcriptUrl);

  React.useEffect(() => {
    if (!episode || !hasChaptersOrTranscript) return;
    if (selectedTab !== 'chapters' && selectedTab !== 'transcript') return;

    let cancelled = false;
    setChaptersTranscriptError(null);
    setChaptersTranscriptLoading(true);
    setItemChapters([]);
    setTranscriptRows([]);

    const load = async () => {
      const { chaptersFeedUrl: cf, transcriptUrl: tu } = getChaptersAndTranscriptUrls(
        episode.bundle
      );
      if (!cf && !tu) {
        setChaptersTranscriptLoading(false);
        return;
      }
      const cached = getCachedChaptersTranscript(episode.idText);
      if (cached) {
        setItemChapters(
          cached.chapters?.length
            ? mapAddByRSSChaptersToDTOItemChapters(cached.chapters).filter(
                (ch) => ch.table_of_contents !== false
              )
            : []
        );
        if (
          cached.transcriptText !== null &&
          cached.transcriptText !== undefined &&
          cached.transcriptText !== ''
        ) {
          const rows = await getTranscriptRowsFromTranscriptString(cached.transcriptText);
          if (!cancelled) setTranscriptRows(rows);
        } else if (!cancelled) {
          setTranscriptRows([]);
        }
        if (!cancelled) setChaptersTranscriptLoading(false);
        return;
      }
      try {
        const res = await getApiRequestService().reqAccountAddByRSSChaptersTranscript({
          itemIdText: episode.idText,
          chaptersFeedUrl: cf,
          transcriptUrl: tu,
          feedUrl: feed?.feedUrl,
        });
        if (cancelled) return;
        setCachedChaptersTranscript(episode.idText, {
          chapters: res.chapters ?? [],
          transcriptText: res.transcriptText,
        });
        setItemChapters(
          res.chapters?.length
            ? mapAddByRSSChaptersToDTOItemChapters(res.chapters).filter(
                (ch) => ch.table_of_contents !== false
              )
            : []
        );
        if (
          res.transcriptText !== null &&
          res.transcriptText !== undefined &&
          res.transcriptText !== ''
        ) {
          const rows = await getTranscriptRowsFromTranscriptString(res.transcriptText);
          if (!cancelled) setTranscriptRows(rows);
        } else if (!cancelled) {
          setTranscriptRows([]);
        }
      } catch (err) {
        if (!cancelled) {
          setChaptersTranscriptError(err instanceof Error ? err.message : tMisc('error_occurred'));
        }
      } finally {
        if (!cancelled) setChaptersTranscriptLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [episode, feed, selectedTab, hasChaptersOrTranscript, tMisc]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!itemIdText) {
        setEpisode(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      if (!loggedInAccount) {
        setEpisode(null);
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
        setEpisode(null);
        setFeed(null);
        setIsLoading(false);
        return;
      }

      const feedRecord = await getAddByRSSFeedByIdText(found.channelIdText);
      if (cancelled) {
        return;
      }

      setEpisode(found);
      setFeed(feedRecord);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [itemIdText, loggedInAccount]);

  const tabData = React.useMemo(() => {
    const tabs: Array<{
      key: 'summary' | 'chapters' | 'transcript';
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
    if (chaptersFeedUrl) {
      tabs.push({
        key: 'chapters',
        label: tInfo('chapter.chapters'),
        onClick: () => setSelectedTab('chapters'),
        zIndex: 2,
      });
    }
    if (transcriptUrl) {
      tabs.push({
        key: 'transcript',
        label: tInfo('transcript.transcript'),
        onClick: () => setSelectedTab('transcript'),
        zIndex: 3,
      });
    }
    return tabs;
  }, [chaptersFeedUrl, transcriptUrl, tInfo]);

  const handlePlayChapter = React.useCallback(
    (chapter: DTOItemChapter) => {
      if (!episode || mpAddByRSS?.idText !== episode.idText) return;
      setMPItemChapter(chapter);
      setMPItemChapterShouldSeek(true);
      window.dispatchEvent(
        new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, {
          detail: { time: Number(chapter.start_time) },
        })
      );
    },
    [episode, mpAddByRSS?.idText, setMPItemChapter, setMPItemChapterShouldSeek]
  );

  if (isLoading) {
    return <LoadingSpinnerOverlay isLoading message={tMisc('loading_your_content')} />;
  }

  if (!episode || !feed) {
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

  const title = episode.bundle.item.title ?? tInfo('episode.episode');
  const description = episode.bundle.description?.value ?? null;
  const chaptersTotalPages = itemChapters.length > 0 ? 1 : 1;

  return (
    <MainWrapper>
      <AddByRSSPodcastHeader feed={feed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSEpisodeDetailHeader
            itemIdText={episode.idText}
            title={title}
            indexItem={episode}
          />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={selectedTab} />} />
          <DetailListWrapper>
            {selectedTab === 'summary' &&
              (description ? <CoreEpisodeSummary description={description} /> : null)}
            {selectedTab === 'chapters' && (
              <>
                {chaptersTranscriptError ? (
                  <NoResults message={chaptersTranscriptError} />
                ) : (
                  <ListItemChapters
                    page={chaptersPage}
                    setPage={setChaptersPage}
                    channel={null}
                    item={null}
                    item_chapters={itemChapters}
                    totalPages={chaptersTotalPages}
                    onPlayChapter={handlePlayChapter}
                    getChapterHref={() => '#'}
                  />
                )}
                <LoadingSpinnerOverlay isLoading={chaptersTranscriptLoading} />
              </>
            )}
            {selectedTab === 'transcript' && (
              <>
                {chaptersTranscriptError ? (
                  <NoResults message={chaptersTranscriptError} />
                ) : (
                  <ItemTranscript autoScrollOn={false} rows={transcriptRows} />
                )}
                <LoadingSpinnerOverlay isLoading={chaptersTranscriptLoading} />
              </>
            )}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
