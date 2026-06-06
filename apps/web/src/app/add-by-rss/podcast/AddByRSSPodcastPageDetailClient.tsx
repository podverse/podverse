'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS, getTotalPages, PAGINATION } from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import {
  CallToActionMessage,
  DescriptionRenderer,
  Divider,
  Dropdown,
  MainColumnStack,
  MainSidebarLayout,
  SideContent,
} from '@podverse/ui';

import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSEpisodeNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { Pagination } from '../../../components/Pagination/Pagination';
import { RSSFeedSettingsSection } from '../../../components/Settings/RSSFeedSettingsSection';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useAddByRSSFeedParseStatusLines } from '../../../hooks/useAddByRSSFeedParseStatusLines';
import { applyAddByRSSParseStatus, pollAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { enqueueAddByRSSParse } from '../../../utils/addByRSS/api';
import {
  buildAddByRSSItemsIndex,
  buildAddByRSSLivestreamIndex,
  buildItemIdTextMap,
} from '../../../utils/addByRSS/itemIndex';
import {
  getAddByRSSFeedByUrl,
  getAddByRSSItemByGuid,
  getAddByRSSLivestreamByGuid,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSLivestreamIndexItem,
  AddByRSSParsedFeed,
} from '../../../utils/addByRSS/types';
import { scrollMainToTop } from '../../../utils/scroll';
import {
  AddByRSSPodcastPageListHeader,
  type AddByRSSPodcastPageTabKey,
} from './AddByRSSPodcastPageListHeader';

import listNodesStyles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSPodcastPageDetailClientProps = {
  feed: AddByRSSFeedRecord;
};

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
  const tV4VBoostMessages = useTranslations('v4v.boost_messages');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const initialType = useMemo<AddByRSSPodcastPageTabKey>(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'about' || typeParam === 'settings' || typeParam === 'boosts') {
      return typeParam;
    }
    return 'episodes';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<AddByRSSPodcastPageTabKey>(initialType);
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
    if (searchParams.has('page') || searchParams.has('sort') || searchParams.has('type')) {
      setCurrentPage(initialPage);
      setSort(initialSort);
      setActiveTab(initialType);
    }
  }, [initialPage, initialSort, initialType, searchParams]);

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

  const statusLines = useAddByRSSFeedParseStatusLines(localFeed, locale, tFeatures, tSettings);

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
  const handleTabSelect = useCallback(
    (key: AddByRSSPodcastPageTabKey) => {
      setActiveTab(key);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (key === 'episodes') {
        nextParams.delete('type');
      } else {
        nextParams.set('type', key);
      }
      const nextQuery = nextParams.toString();
      router.replace(nextQuery === '' ? pathname : `${pathname}?${nextQuery}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const boostChannel = useMemo(() => buildAddByRssBoostChannel(localFeed), [localFeed]);
  const { canShowBoostTab, boostsPageFetcher, breadcrumbLinkResolver, refreshTrigger } =
    useBoostMessagesView({
      channel: boostChannel,
      scopeType: 'channel',
      channelIdText: localFeed.idText,
      resolveChannelHref: (channelIdText) => `/add-by-rss/podcast/${channelIdText}`,
      resolveItemIdTextByGuid: async (itemGuid) => {
        const item = await getAddByRSSItemByGuid(itemGuid);
        if (item?.idText) {
          return item.idText;
        }

        const livestream = await getAddByRSSLivestreamByGuid(itemGuid);
        return livestream?.idText ?? null;
      },
      resolveItemHref: (itemIdText) => `/add-by-rss/episode/${itemIdText}`,
    });

  useEffect(() => {
    if (!canShowBoostTab && activeTab === 'boosts') {
      handleTabSelect('episodes');
    }
  }, [activeTab, canShowBoostTab, handleTabSelect]);

  return (
    <MainWrapper>
      <AddByRSSPodcastHeader feed={localFeed} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <AddByRSSPodcastPageListHeader
            selectedKey={activeTab}
            onSelect={handleTabSelect}
            canShowBoosts={canShowBoostTab}
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
            {activeTab === 'boosts' && boostsPageFetcher !== null && (
              <BoostMessagesSection
                heading={tV4VBoostMessages('title')}
                pageFetcher={boostsPageFetcher}
                breadcrumbLinkResolver={breadcrumbLinkResolver}
                refreshTrigger={refreshTrigger}
              />
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
                  statusLines={statusLines}
                  errorMessage={errorMessage}
                />
              </SettingsWrapper>
            )}
          </DetailListWrapper>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
};
