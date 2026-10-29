'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AddByRSSParseStatus } from '@podverse/helpers';
import {
  DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS,
  getTotalPages,
  isDescriptionTruncated,
  PAGINATION,
} from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import {
  CallToActionMessage,
  DescriptionRenderer,
  Divider,
  MainColumnStack,
  MainSidebarLayout,
  SideContent,
} from '@podverse/ui';

import { AddByRSSAlbumHeader } from '../../../components/AddByRSS/Artist/Album/AddByRSSAlbumHeader';
import { AddByRSSAlbumTrackNodes } from '../../../components/AddByRSS/Artist/Album/Track/AddByRSSAlbumTrackNodes';
import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { AddByRSSRemoteItemList } from '../../../components/AddByRSS/RemoteItems/AddByRSSRemoteItemList';
import { BoostMessagesSection } from '../../../components/Boost/messages/BoostMessagesSection';
import { useBoostMessagesView } from '../../../components/Boost/messages/useBoostMessagesView';
import { DescriptionTruncationNotice } from '../../../components/Content/Description/DescriptionTruncationNotice';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { ListSortChip } from '../../../components/ListSortChip/ListSortChip';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { Pagination } from '../../../components/Pagination/Pagination';
import type { AddByRSSCredentialsApplyStatus } from '../../../components/Settings/AddByRSSCredentialsSettingsSection';
import { AddByRSSCredentialsSettingsSection } from '../../../components/Settings/AddByRSSCredentialsSettingsSection';
import { RSSFeedSettingsSection } from '../../../components/Settings/RSSFeedSettingsSection';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useAddByRSSFeedParseStatusLines } from '../../../hooks/useAddByRSSFeedParseStatusLines';
import { useAddByRSSRemoteItemList } from '../../../hooks/useAddByRSSRemoteItemList';
import type { AddByRSSParseOutcome } from '../../../utils/addByRSS/actions';
import {
  applyAddByRSSParseStatus,
  applyListedAddByRSSParseStatus,
  enqueueAddByRSSParseWithStoredCredentials,
  pollAddByRSSParseStatus,
} from '../../../utils/addByRSS/actions';
import { selectChannelOrderedLiveItems } from '../../../utils/addByRSS/channelLiveItems';
import {
  buildAddByRSSItemsIndex,
  buildAddByRSSLivestreamIndex,
  buildItemIdTextMap,
} from '../../../utils/addByRSS/itemIndex';
import {
  isListedFeedRecord,
  listedAddByRSSLivestreamIndexItems,
  listedAddByRSSTrackIndexItems,
} from '../../../utils/addByRSS/listedFeeds';
import {
  getAddByRSSFeedByUrl,
  getAddByRSSItemByGuid,
  getAddByRSSLivestreamByGuid,
  getListedAddByRSSFeedByUrl,
} from '../../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSLivestreamIndexItem,
  AddByRSSParsedFeed,
} from '../../../utils/addByRSS/types';
import { scrollMainToTop } from '../../../utils/scroll';
import type { AddByRSSAlbumPageTabKey } from './AddByRSSAlbumPageListHeader';
import { AddByRSSAlbumPageListHeader } from './AddByRSSAlbumPageListHeader';

import listNodesStyles from '../../../styles/components/Common/List/ListNodes.module.scss';

type AddByRSSAlbumPageClientProps = {
  feed: AddByRSSFeedRecord;
  /**
   * False for an album an Add by RSS artist lists but the member does not follow. Its tracks and
   * livestreams are built in memory and every write goes to the listed store.
   */
  followed: boolean;
};

type AddByRSSAlbumSort = 'recent' | 'oldest' | 'forward' | 'reverse';

const toSortOption = (value: string | null): AddByRSSAlbumSort => {
  if (value === 'oldest' || value === 'recent' || value === 'forward' || value === 'reverse') {
    return value;
  }
  return 'forward';
};

export const AddByRSSAlbumPageClient: React.FC<AddByRSSAlbumPageClientProps> = ({
  feed,
  followed,
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
  const initialType = useMemo<AddByRSSAlbumPageTabKey>(() => {
    const typeParam = searchParams.get('type');
    if (
      typeParam === 'about' ||
      typeParam === 'settings' ||
      typeParam === 'boosts' ||
      typeParam === 'podroll' ||
      typeParam === 'remote_items'
    ) {
      return typeParam;
    }
    return 'tracks';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<AddByRSSAlbumPageTabKey>(initialType);
  const [localFeed, setLocalFeed] = useState(feed);
  const [listedFeed, setListedFeed] = useState<AddByRSSListedFeedRecord | null>(
    !followed && isListedFeedRecord(feed) ? feed : null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemIdTextMap, setItemIdTextMap] = useState<Map<string, string>>(new Map());
  const [liveItems, setLiveItems] = useState<AddByRSSLivestreamIndexItem[]>([]);
  const initialPage = useMemo(() => {
    const value = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isNaN(value) || value < 1 ? 1 : value;
  }, [searchParams]);
  const initialSort: AddByRSSAlbumSort = useMemo(
    () => toSortOption(searchParams.get('sort')),
    [searchParams]
  );
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [sort, setSort] = useState<AddByRSSAlbumSort>(initialSort);

  useEffect(() => {
    setLocalFeed(feed);
    setListedFeed(!followed && isListedFeedRecord(feed) ? feed : null);
    setCurrentPage(1);
  }, [feed, followed]);

  useEffect(() => {
    // The index builders rewrite the global stores from the feeds they get, so a listed album
    // never goes through them.
    if (!followed) {
      const trackItems = listedFeed ? listedAddByRSSTrackIndexItems(listedFeed) : [];
      setItemIdTextMap(new Map(trackItems.map((item) => [item.id, item.idText])));
      setLiveItems(listedFeed ? listedAddByRSSLivestreamIndexItems(listedFeed) : []);
      return;
    }
    const init = async () => {
      await buildAddByRSSItemsIndex([localFeed]);
      const livestreams = await buildAddByRSSLivestreamIndex([localFeed]);
      const map = await buildItemIdTextMap();
      setItemIdTextMap(map);
      setLiveItems(livestreams);
    };
    void init();
  }, [followed, listedFeed, localFeed]);

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
      if (sort === 'oldest' || sort === 'forward') {
        return aDate - bDate;
      }
      return bDate - aDate;
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
    const nextSort = toSortOption(value);
    setSort(nextSort);
    setCurrentPage(1);
  };

  const sortOptions: { value: 'forward' | 'backward'; label: string }[] = [
    { value: 'forward', label: tFilters('sort.forward') },
    { value: 'backward', label: tFilters('sort.backward') },
  ];

  const statusLines = useAddByRSSFeedParseStatusLines(localFeed, locale, tFeatures, tSettings);

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSParseStatus,
      cache?: AddByRSSFeedRecord['cache'],
      outcome?: AddByRSSParseOutcome
    ) => {
      if (!followed) {
        await applyListedAddByRSSParseStatus({
          feedUrl,
          parsedFeed,
          status,
          cache,
          outcome,
          fallbackRecord: listedFeed,
          onUpdated: (record) => {
            setListedFeed(record);
            setLocalFeed(record);
          },
        });
        return;
      }
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        outcome,
        fallbackRecord: localFeed,
        onUpdated: (record) => {
          setLocalFeed(record);
        },
      });
    },
    [followed, listedFeed, localFeed]
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
              statusResponse.cache,
              statusResponse
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
      const response = await enqueueAddByRSSParseWithStoredCredentials({
        accountId: loggedInAccount.id_text,
        feedUrl: localFeed.feedUrl,
      });
      await handleParseStatus(localFeed.feedUrl, undefined, 'queued');
      await pollRequest(response.request_id, localFeed.feedUrl);
      if (followed) {
        const refreshed = await getAddByRSSFeedByUrl(localFeed.feedUrl);
        if (refreshed) {
          setLocalFeed(refreshed);
        }
      } else {
        const refreshed = await getListedAddByRSSFeedByUrl(localFeed.feedUrl);
        if (refreshed) {
          setListedFeed(refreshed);
          setLocalFeed(refreshed);
        }
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
    followed,
    handleParseStatus,
    localFeed.feedUrl,
    loggedInAccount,
    pollRequest,
    setModalAuthLogin,
    tFeatures,
  ]);

  const applyListedCredentialsStatus = useCallback<AddByRSSCredentialsApplyStatus>(
    async (params) => {
      const fallbackRecord = isListedFeedRecord(params.fallbackRecord)
        ? params.fallbackRecord
        : listedFeed;
      if (fallbackRecord === null) {
        return null;
      }
      return applyListedAddByRSSParseStatus({
        cache: params.cache,
        fallbackRecord,
        feedUrl: params.feedUrl,
        outcome: params.outcome,
        parsedFeed: params.parsedFeed,
        status: params.status,
      });
    },
    [listedFeed]
  );

  const handleListedCredentialsFeedUpdated = useCallback((updated: AddByRSSFeedRecord) => {
    if (isListedFeedRecord(updated)) {
      setListedFeed(updated);
      setLocalFeed(updated);
    }
  }, []);

  const sortedLiveItems = useMemo(() => selectChannelOrderedLiveItems(liveItems), [liveItems]);

  const showLiveItems = activeTab === 'tracks' && currentPage === 1 && sortedLiveItems.length > 0;
  const handleTabSelect = useCallback(
    (key: AddByRSSAlbumPageTabKey) => {
      setActiveTab(key);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (key === 'tracks') {
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
      scopeType: 'album',
      channelIdText: localFeed.idText,
      resolveChannelHref: (channelIdText) => `/add-by-rss/album/${channelIdText}`,
      resolveItemIdTextByGuid: async (itemGuid) => {
        if (!followed && listedFeed) {
          const listedTrack = listedAddByRSSTrackIndexItems(listedFeed).find(
            (entry) => entry.itemGuid === itemGuid
          );
          if (listedTrack) {
            return listedTrack.idText;
          }
          const listedLivestream = listedAddByRSSLivestreamIndexItems(listedFeed).find(
            (entry) => entry.itemGuid === itemGuid
          );
          if (listedLivestream) {
            return listedLivestream.idText;
          }
        }

        const item = await getAddByRSSItemByGuid(itemGuid);
        if (item?.idText) {
          return item.idText;
        }

        const livestream = await getAddByRSSLivestreamByGuid(itemGuid);
        return livestream?.idText ?? null;
      },
      resolveItemHref: (itemIdText) => `/add-by-rss/track/${itemIdText}`,
    });
  const podroll = useAddByRSSRemoteItemList(localFeed, 'podroll');
  const remoteItems = useAddByRSSRemoteItemList(localFeed, 'remote_items');

  useEffect(() => {
    if (!canShowBoostTab && activeTab === 'boosts') {
      handleTabSelect('tracks');
    }
  }, [activeTab, canShowBoostTab, handleTabSelect]);

  useEffect(() => {
    if (!podroll.hasRows && activeTab === 'podroll') {
      handleTabSelect('tracks');
    }
  }, [activeTab, handleTabSelect, podroll.hasRows]);

  useEffect(() => {
    if (!remoteItems.hasRows && activeTab === 'remote_items') {
      handleTabSelect('tracks');
    }
  }, [activeTab, handleTabSelect, remoteItems.hasRows]);

  return (
    <MainWrapper>
      <AddByRSSAlbumHeader feed={localFeed} />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          <AddByRSSAlbumPageListHeader
            selectedKey={activeTab}
            onSelect={handleTabSelect}
            canShowBoosts={canShowBoostTab}
            hasPodroll={podroll.hasRows}
            hasRemoteItems={remoteItems.hasRows}
            trailing={
              activeTab === 'tracks' ? (
                <ListSortChip
                  onChange={(nextSort) => {
                    handleSortChange(nextSort);
                  }}
                  options={sortOptions}
                  position="right"
                  range={null}
                  testId="add-by-rss-album-detail-sort"
                  value={sort === 'reverse' ? 'backward' : 'forward'}
                />
              ) : null
            }
          />
          <DetailListWrapper>
            {activeTab === 'tracks' && (
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
                    />
                  )}
                  {showLiveItems && sortedLiveItems.length > 0 && <Divider />}
                  <AddByRSSAlbumTrackNodes
                    channelIdText={localFeed.idText}
                    channelTitle={channelTitle}
                    channelImageUrl={channelImageUrl}
                    items={pagedItems}
                    itemIdTextMap={itemIdTextMap}
                  />
                </div>
              </Pagination>
            )}
            {activeTab === 'about' && channelDescription && (
              <>
                <DescriptionRenderer description={channelDescription} />
                {isDescriptionTruncated(mappedChannel?.description) ? (
                  <DescriptionTruncationNotice
                    kind="channel"
                    linkUrl={mappedChannel?.about?.website_link_url}
                  />
                ) : null}
              </>
            )}
            {activeTab === 'podroll' && (
              <AddByRSSRemoteItemList
                rows={podroll.rows}
                openReference={podroll.openReference}
                openingKey={podroll.openingKey}
                errorMessage={podroll.errorMessage}
              />
            )}
            {activeTab === 'remote_items' && (
              <AddByRSSRemoteItemList
                rows={remoteItems.rows}
                openReference={remoteItems.openReference}
                openingKey={remoteItems.openingKey}
                errorMessage={remoteItems.errorMessage}
              />
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
                {loggedInAccount ? (
                  <AddByRSSCredentialsSettingsSection
                    accountIdText={loggedInAccount.id_text}
                    feed={localFeed}
                    onFeedUpdated={followed ? setLocalFeed : handleListedCredentialsFeedUpdated}
                    applyStatus={followed ? undefined : applyListedCredentialsStatus}
                  />
                ) : null}
              </SettingsWrapper>
            )}
          </DetailListWrapper>
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
};
