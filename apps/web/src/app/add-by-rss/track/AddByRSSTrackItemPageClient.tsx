'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { TranscriptRow } from '@podverse/helpers';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import { MainColumnStack, MainSidebarLayout, SideContent, Tabs } from '@podverse/ui';

import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSTrackDetailHeader } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSTrackDetailHeader';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { CommonDetailListHeader } from '../../../components/Common/List/CommonDetailListHeader';
import { CoreEpisodeSummary } from '../../../components/Core/Podcast/Episodes/CoreEpisodeSummary';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import {
  WebLoadingSpinnerOverlay,
  WebLoadingYourContentSpinnerOverlay,
} from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { useAccount } from '../../../contexts/Account';
import { getApiRequestService } from '../../../factories/apiRequestService';
import {
  getCachedChaptersTranscript,
  getChaptersAndTranscriptUrls,
  setCachedChaptersTranscript,
} from '../../../utils/addByRSS/chaptersTranscript';
import {
  getAddByRSSFeedByIdText,
  getAddByRSSItemByGuid,
  getAddByRSSItemByIdText,
  getAddByRSSLivestreamByGuid,
} from '../../../utils/addByRSS/storage';
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

type AddByRSSTrackItemPageClientProps = {
  itemIdText: string;
};

export const AddByRSSTrackItemPageClient: React.FC<AddByRSSTrackItemPageClientProps> = ({
  itemIdText,
}) => {
  const tFeatures = useTranslations('features');
  const tInfo = useTranslations('info');
  const tMisc = useTranslations('misc');
  const tValue = useTranslations('value');
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loggedInAccount } = useAccount();
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [track, setTrack] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const initialType = React.useMemo<'summary' | 'boosts' | 'transcript'>(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'boosts' || typeParam === 'transcript') {
      return typeParam;
    }
    return 'summary';
  }, [searchParams]);
  const [selectedTab, setSelectedTab] = React.useState<'summary' | 'boosts' | 'transcript'>(
    initialType
  );
  const [transcriptRows, setTranscriptRows] = React.useState<TranscriptRow[]>([]);
  const [transcriptLoading, setTranscriptLoading] = React.useState(false);
  const [transcriptError, setTranscriptError] = React.useState<string | null>(null);

  const transcriptUrl = React.useMemo(() => {
    if (!track) return undefined;
    return getChaptersAndTranscriptUrls(track.bundle).transcriptUrl;
  }, [track]);
  const boostChannel = React.useMemo(() => (feed ? buildAddByRssBoostChannel(feed) : null), [feed]);
  const { canShowBoostTab, boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } =
    useBoostMessagesView({
      channel: boostChannel,
      itemGuid: track?.itemGuid ?? null,
      scopeType: 'track',
      channelIdText: feed?.idText ?? null,
      resolveChannelHref: (channelIdText) => `/add-by-rss/album/${channelIdText}`,
      resolveItemIdTextByGuid: async (itemGuid) => {
        const item = await getAddByRSSItemByGuid(itemGuid);
        if (item?.idText) {
          return item.idText;
        }

        const livestream = await getAddByRSSLivestreamByGuid(itemGuid);
        return livestream?.idText ?? null;
      },
      resolveItemHref: (itemIdText) => `/add-by-rss/track/${itemIdText}`,
    });

  const handleTabSelect = React.useCallback(
    (tab: 'summary' | 'boosts' | 'transcript') => {
      setSelectedTab(tab);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (tab === 'summary') {
        nextParams.delete('type');
      } else {
        nextParams.set('type', tab);
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery === '' ? pathname : `${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  React.useEffect(() => {
    if (!canShowBoostTab && selectedTab === 'boosts') {
      handleTabSelect('summary');
    }
  }, [canShowBoostTab, handleTabSelect, selectedTab]);

  React.useEffect(() => {
    if (searchParams.has('type')) {
      setSelectedTab(initialType);
    }
  }, [initialType, searchParams]);

  React.useEffect(() => {
    if (selectedTab === 'transcript' && !transcriptUrl) {
      handleTabSelect('summary');
      return;
    }
    if (selectedTab === 'boosts' && boostsPageFetcher === null) {
      handleTabSelect('summary');
    }
  }, [boostsPageFetcher, handleTabSelect, selectedTab, transcriptUrl]);

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
        const res = await getApiRequestService().reqAccountAddByRSSChaptersTranscript({
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

  const tabData = React.useMemo(() => {
    const tabs: Array<{
      key: 'summary' | 'boosts' | 'transcript';
      label: string;
      onClick: () => void;
      zIndex: number;
    }> = [
      {
        key: 'summary',
        label: tInfo('summary.summary'),
        onClick: () => handleTabSelect('summary'),
        zIndex: 1,
      },
    ];
    if (canShowBoostTab) {
      tabs.push({
        key: 'boosts',
        label: tValue('boost'),
        onClick: () => handleTabSelect('boosts'),
        zIndex: 2,
      });
    }
    if (transcriptUrl) {
      tabs.push({
        key: 'transcript',
        label: tInfo('transcript.lyrics'),
        onClick: () => handleTabSelect('transcript'),
        zIndex: 1,
      });
    }
    return tabs;
  }, [canShowBoostTab, handleTabSelect, tInfo, tValue, transcriptUrl]);

  if (isLoading) {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  if (!track || !feed) {
    return (
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    );
  }

  const title = track.bundle.item.title ?? tInfo('track.track');
  const description = track.bundle.description?.value ?? null;

  return (
    <MainWrapper>
      <AddByRSSAlbumHeader feed={feed} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <AddByRSSTrackDetailHeader itemIdText={track.idText} title={title} indexItem={track} />
          <CommonDetailListHeader tabs={<Tabs tabData={tabData} selectedKey={selectedTab} />} />
          <DetailListWrapper>
            {selectedTab === 'summary' &&
              (description ? <CoreEpisodeSummary description={description} /> : null)}
            {selectedTab === 'boosts' && boostsPageFetcher !== null && (
              <BoostMessagesSection
                heading={tV4VBoostMessages('title')}
                pageFetcher={boostsPageFetcher}
                breadcrumbLinkResolver={breadcrumbLinkResolver}
                refreshTrigger={refreshTrigger}
              />
            )}
            {selectedTab === 'transcript' && (
              <>
                {transcriptError ? (
                  <NoResults message={transcriptError} />
                ) : (
                  <ItemTranscript autoScrollOn={false} rows={transcriptRows} />
                )}
                <WebLoadingSpinnerOverlay isLoading={transcriptLoading} />
              </>
            )}
          </DetailListWrapper>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
};
