'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { TranscriptRow } from '@podverse/helpers';
import { isDescriptionTruncated } from '@podverse/helpers';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import type { ChipRowItem } from '@podverse/ui';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

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
import { useDescriptionClockPlayback } from '../../../hooks/useDescriptionClockPlayback';
import type { ArtistLineLink } from '../../../lib/artistPublishers';
import {
  getAddByRSSChaptersTranscriptCredentials,
  getCachedChaptersTranscript,
  getChaptersAndTranscriptUrls,
  setCachedChaptersTranscript,
} from '../../../utils/addByRSS/chaptersTranscript';
import { resolveDeviceArtistLinks } from '../../../utils/addByRSS/deviceArtistLinks';
import { onAddByRSSFeedChanged } from '../../../utils/addByRSS/feedChangedEvent';
import { findListedAddByRSSTrack } from '../../../utils/addByRSS/listedFeeds';
import {
  getAddByRSSAlbumSourceByIdText,
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
  const accountId = loggedInAccount?.id_text ?? null;
  const [feed, setFeed] = React.useState<AddByRSSFeedRecord | null>(null);
  const [track, setTrack] = React.useState<AddByRSSItemIndexItem | null>(null);
  const [artistLinks, setArtistLinks] = React.useState<ArtistLineLink[]>([]);
  const [artistReloadKey, setArtistReloadKey] = React.useState(0);
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
        const listed = await findListedAddByRSSTrack(itemIdText);
        if (cancelled) {
          return;
        }
        setTrack(listed?.item ?? null);
        setFeed(listed?.feed ?? null);
        setIsLoading(false);
        return;
      }

      const feedRecord = (await getAddByRSSAlbumSourceByIdText(found.channelIdText))?.feed ?? null;
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

  const artistFeedUrl = feed?.feedUrl;
  const artistChannelIdText = feed?.idText;
  const artistAccountIdText = loggedInAccount?.id_text;

  React.useEffect(() => onAddByRSSFeedChanged(() => setArtistReloadKey((k) => k + 1)), []);

  React.useEffect(() => {
    if (
      artistAccountIdText === undefined ||
      artistFeedUrl === undefined ||
      artistChannelIdText === undefined
    ) {
      setArtistLinks([]);
      return;
    }

    let cancelled = false;
    setArtistLinks([]);

    void resolveDeviceArtistLinks({
      addByRSS: { feedUrl: artistFeedUrl, channelIdText: artistChannelIdText },
      channel: null,
      item: null,
    })
      .then((links) => {
        if (!cancelled) {
          setArtistLinks(links);
        }
      })
      .catch((error: unknown) => {
        console.error('Device artist links could not be read', error);
        if (!cancelled) {
          setArtistLinks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artistFeedUrl, artistChannelIdText, artistAccountIdText, artistReloadKey]);

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
        const credentials = await getAddByRSSChaptersTranscriptCredentials({
          accountId,
          feedUrl: feed?.feedUrl,
          resourceUrls: [transcriptUrl],
        });
        if (cancelled) return;
        const res = await getApiRequestService().reqAccountAddByRSSChaptersTranscript({
          itemIdText: track.idText,
          transcriptUrl,
          feedUrl: feed?.feedUrl,
          ...credentials,
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
  }, [track, feed, selectedTab, transcriptUrl, tMisc, accountId]);

  const items = React.useMemo(() => {
    const next: ChipRowItem<'summary' | 'boosts' | 'transcript'>[] = [
      {
        key: 'summary',
        label: tInfo('summary.summary'),
      },
    ];
    if (canShowBoostTab) {
      next.push({
        key: 'boosts',
        label: tValue('boost'),
      });
    }
    if (transcriptUrl) {
      next.push({
        key: 'transcript',
        label: tInfo('transcript.lyrics'),
      });
    }
    return next;
  }, [canShowBoostTab, tInfo, tValue, transcriptUrl]);

  const clock = useDescriptionClockPlayback(
    track === null ? null : { indexItem: track, kind: 'add-by-rss' }
  );

  if (isLoading) {
    return <WebLoadingYourContentSpinnerOverlay isLoading />;
  }

  if (!track || !feed) {
    return (
      <MainWrapper>
        <MainSidebarLayout>
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
        <MainColumnStack>
          <AddByRSSTrackDetailHeader
            itemIdText={track.idText}
            title={title}
            indexItem={track}
            artistLinks={artistLinks}
          />
          <CommonDetailListHeader
            items={items}
            onSelect={handleTabSelect}
            selectedKey={selectedTab}
            testId="add-by-rss-track-detail-chips"
          />
          <DetailListWrapper fill={selectedTab === 'transcript'}>
            {selectedTab === 'summary' &&
              (description ? (
                <CoreEpisodeSummary
                  description={description}
                  descriptionClockLabel={clock.descriptionClockLabel}
                  onDescriptionClock={clock.onDescriptionClock}
                  isTruncated={isDescriptionTruncated(track.bundle.description)}
                  fullNotesUrl={track.bundle.about.website_link_url}
                />
              ) : null)}
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
                  <ItemTranscript rows={transcriptRows} />
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
