'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS,
  formatDateTimeAbbrev,
  getTotalPages,
  PAGINATION,
} from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';

import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSEpisodeNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes';
import { CallToActionMessage } from '../../../components/CallToActionMessage/CallToActionMessage';
import { DescriptionRenderer } from '../../../components/Description/DescriptionRenderer';
import { Divider } from '../../../components/Divider/Divider';
import Dropdown from '../../../components/Dropdown/Dropdown';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import Pagination from '../../../components/Pagination/Pagination';
import { RSSFeedSettingsSection } from '../../../components/Settings/RSSFeedSettingsSection';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { applyAddByRSSParseStatus, pollAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { enqueueAddByRSSParse } from '../../../utils/addByRSS/api';
import {
  buildAddByRSSItemsIndex,
  buildAddByRSSLivestreamIndex,
  buildItemIdTextMap,
} from '../../../utils/addByRSS/itemIndex';
import { getAddByRSSFeedByUrl } from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSLivestreamIndexItem,
  AddByRSSParsedFeed,
} from '../../../utils/addByRSS/types';
import { scrollMainToTop } from '../../../utils/scroll';
import { AddByRSSPodcastPageListHeader } from './AddByRSSPodcastPageListHeader';

import listNodesStyles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSPodcastPageDetailClientProps = {
  feed: AddByRSSFeedRecord;
};

type AddByRSSPodcastPageTabKey = 'episodes' | 'about' | 'settings';
type AddByRSSPodcastSort = 'recent' | 'oldest';

export const AddByRSSPodcastPageDetailClient: React.FC<AddByRSSPodcastPageDetailClientProps> = ({
  feed,
}) => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tFilters = useTranslations('filters');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const [activeTab, setActiveTab] = useState<AddByRSSPodcastPageTabKey>('episodes');
  const [localFeed, setLocalFeed] = useState(feed);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemIdTextMap, setItemIdTextMap] = useState<Map<string, string>>(new Map());
  const [liveItems, setLiveItems] = useState<AddByRSSLivestreamIndexItem[]>([]);
  const initialPage = useMemo(() => {
    const value = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isNaN(value) || value < 1 ? 1 : value;
  }, [searchParams]);
  const initialSort: AddByRSSPodcastSort = useMemo(
    () => (searchParams.get('sort') === 'oldest' ? 'oldest' : 'recent'),
    [searchParams]
  );
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sort, setSort] = useState<AddByRSSPodcastSort>(initialSort);

  useEffect(() => {
    setLocalFeed(feed);
    setCurrentPage(1);
  }, [feed]);

  useEffect(() => {
    const init = async () => {
      await buildAddByRSSItemsIndex([localFeed]);
      const livestreams = await buildAddByRSSLivestreamIndex([localFeed]);
      const map = await buildItemIdTextMap();
      setItemIdTextMap(map);
      setLiveItems(livestreams);
    };
    void init();
  }, [localFeed]);

  useEffect(() => {
    if (searchParams.has('page') || searchParams.has('sort')) {
      setCurrentPage(initialPage);
      setSort(initialSort);
    }
  }, [initialPage, initialSort, searchParams]);

  const mappedFeed = localFeed.mappedFeed;
  const mappedChannel = mappedFeed?.channel;
  const channelTitle = mappedChannel?.channel?.title ?? localFeed.title ?? localFeed.feedUrl;
  const channelImageUrl = localFeed.imageUrl ?? mappedChannel?.images?.[0]?.url ?? undefined;
  const channelDescription = mappedChannel?.description?.value ?? null;
  const items = mappedFeed?.items ?? [];
  const itemsPerPage = PAGINATION.DEFAULT_LIMIT;
  const sortedItems = useMemo(() => {
    const next = [...items];
    next.sort((a, b) => {
      const aDate = a.item.pub_date ? new Date(a.item.pub_date).getTime() : 0;
      const bDate = b.item.pub_date ? new Date(b.item.pub_date).getTime() : 0;
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
    return next;
  }, [items, sort]);
  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, sortedItems]);
  const totalPages = useMemo(
    () => getTotalPages(items.length, itemsPerPage, pagedItems.length, currentPage),
    [currentPage, items.length, itemsPerPage, pagedItems.length]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const handlePageChange = useCallback((page: number) => {
    scrollMainToTop();
    setCurrentPage(page);
  }, []);
  const handleSortChange = (value: string) => {
    const nextSort = value === 'oldest' ? 'oldest' : 'recent';
    setSort(nextSort);
    setCurrentPage(1);
  };

  const lastParsedLabel = useMemo(() => {
    if (!localFeed.lastParsedAt) {
      return null;
    }
    const formatted = formatDateTimeAbbrev(localFeed.lastParsedAt, locale);
    return tSettings('feed.last_parsed', { date: formatted });
  }, [localFeed.lastParsedAt, locale, tSettings]);

  const sortMenuItems = useMemo(
    () => [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    ],
    [tFilters]
  );

  const sideButtons =
    activeTab === 'episodes' ? (
      <Dropdown value={sort} menuItems={sortMenuItems} onChange={handleSortChange} />
    ) : null;

  const statusLabel = useMemo(() => {
    switch (localFeed.status) {
      case 'queued':
        return tFeatures('add_by_rss.status_pending');
      case 'processing':
        return tFeatures('add_by_rss.status_parsing');
      case 'failed':
        return tFeatures('add_by_rss.status_failed');
      case 'parsed':
      case 'not_modified':
        return lastParsedLabel;
      default:
        return null;
    }
  }, [lastParsedLabel, localFeed.status, tFeatures]);

  const statusLine = useMemo(() => {
    if (!statusLabel) {
      return null;
    }
    if (localFeed.status === 'parsed' || localFeed.status === 'not_modified') {
      return statusLabel;
    }
    return `${tFeatures('add_by_rss.status')}: ${statusLabel}`;
  }, [localFeed.status, statusLabel, tFeatures]);

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSFeedRecord['status'],
      cache?: AddByRSSFeedRecord['cache']
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        fallbackRecord: localFeed,
        onUpdated: (record) => {
          setLocalFeed(record);
        },
      });
    },
    [localFeed]
  );

  const pollRequest = useCallback(
    async (requestId: string, feedUrl: string) => {
      try {
        await pollAddByRSSParseStatus({
          requestId,
          onStatusUpdate: async (statusResponse) => {
            await handleParseStatus(
              feedUrl,
              statusResponse.payload,
              statusResponse.status,
              statusResponse.cache
            );
          },
        });
      } catch (error) {
        const message = (error as Error).message;
        if (message.startsWith('Parse status timed out')) {
          setErrorMessage(message);
          return;
        }
        setErrorMessage(`Parse status check failed. Request ID: ${requestId}`);
      }
    },
    [handleParseStatus]
  );

  const handleRefreshFeed = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const response = await enqueueAddByRSSParse({ feedUrl: localFeed.feedUrl });
      await handleParseStatus(localFeed.feedUrl, undefined, 'queued');
      await pollRequest(response.request_id, localFeed.feedUrl);
      const refreshed = await getAddByRSSFeedByUrl(localFeed.feedUrl);
      if (refreshed) {
        setLocalFeed(refreshed);
      }
    } catch (error) {
      const statusCode = getStatusCodeFromError(error);
      if (statusCode === 429) {
        const responseData = (error as { response?: { data?: { retry_after_seconds?: number } } })
          .response?.data;
        const retryAfterSeconds = responseData?.retry_after_seconds;
        const fallbackMinutes = Math.ceil(DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS / 60000);
        const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? fallbackMinutes * 60) / 60));
        const waitKey =
          minutes === 1 ? 'add_by_rss.wait_to_retry_minute' : 'add_by_rss.wait_to_retry_minutes';
        setErrorMessage(tFeatures(waitKey, { minutes }));
        return;
      }
      setErrorMessage((error as Error).message);
    } finally {
      setIsUpdating(false);
    }
  }, [
    handleParseStatus,
    localFeed.feedUrl,
    loggedInAccount,
    pollRequest,
    setModalAuthLogin,
    tFeatures,
  ]);

  const sortedLiveItems = useMemo(() => {
    const next = [...liveItems];
    next.sort((a, b) => b.startTimeMs - a.startTimeMs);
    return next;
  }, [liveItems]);

  const showLiveItems = activeTab === 'episodes' && currentPage === 1 && sortedLiveItems.length > 0;

  return (
    <MainWrapper>
      <AddByRSSPodcastHeader feed={localFeed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSPodcastPageListHeader
            selectedKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
            sideButtons={sideButtons}
          />
          <DetailListWrapper>
            {activeTab === 'episodes' && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                setPage={handlePageChange}
              >
                <div className={listNodesStyles.list}>
                  {showLiveItems && (
                    <AddByRSSLivestreamNodes
                      items={sortedLiveItems}
                      viewSelected="rows"
                      showChannelInfo={false}
                      sortOrder={sort}
                    />
                  )}
                  {showLiveItems && sortedLiveItems.length > 0 && <Divider />}
                  <AddByRSSEpisodeNodes
                    channelIdText={localFeed.idText}
                    channelTitle={channelTitle}
                    channelImageUrl={channelImageUrl}
                    items={pagedItems}
                    itemIdTextMap={itemIdTextMap}
                    sortOrder={sort}
                  />
                </div>
              </Pagination>
            )}
            {activeTab === 'about' && channelDescription && (
              <DescriptionRenderer description={channelDescription} />
            )}
            {activeTab === 'settings' && (
              <SettingsWrapper removeWrapperMargin>
                {!loggedInAccount && (
                  <CallToActionMessage
                    message={tInstructions('login_for_subscriptions')}
                    buttonLabel={tAuthentication('login')}
                    onButtonClick={() => setModalAuthLogin({ isOpen: true })}
                  />
                )}
                <RSSFeedSettingsSection
                  title={tInfo('rss_feed')}
                  buttonLabel={tSettings('feed.check_feed_for_updates')}
                  onCheckUpdates={handleRefreshFeed}
                  isLoading={isUpdating}
                  disabled={localFeed.status === 'processing'}
                  statusLine={statusLine}
                  errorMessage={errorMessage}
                />
              </SettingsWrapper>
            )}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
