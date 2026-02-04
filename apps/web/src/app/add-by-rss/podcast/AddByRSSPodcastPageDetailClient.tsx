'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS,
  formatDateTimeAbbrev,
  getTotalPages,
  PAGINATION,
} from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';

import { CallToActionMessage } from '../../../components/CallToActionMessage/CallToActionMessage';
import { DescriptionRenderer } from '../../../components/Description/DescriptionRenderer';
import LoadingSpinnerOverlay from '../../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import Pagination from '../../../components/Pagination/Pagination';
import { DetailListWrapper } from '../../../components/List/DetailListWrapper';
import { RSSFeedSettingsSection } from '../../../components/Settings/RSSFeedSettingsSection';
import { SideContent } from '../../../components/SideContent/SideContent';
import { AddByRSSPodcastHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastHeader';
import { AddByRSSEpisodeNodes } from '../../../components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes';
import { SettingsWrapper } from '../../../components/Settings/SettingsWrapper';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { scrollMainToTop } from '../../../utils/scroll';
import { enqueueAddByRSSParse } from '../../../utils/addByRSS/api';
import { applyAddByRSSParseStatus, pollAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { getAddByRSSFeedByUrl } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed } from '../../../utils/addByRSS/types';
import { AddByRSSPodcastPageListHeader } from '../../../components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader';

type AddByRSSPodcastPageDetailClientProps = {
  feed: AddByRSSFeedRecord;
};

type AddByRSSPodcastPageTabKey = 'episodes' | 'about' | 'settings';

export const AddByRSSPodcastPageDetailClient: React.FC<AddByRSSPodcastPageDetailClientProps> = ({
  feed,
}) => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const locale = useLocale();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const [activeTab, setActiveTab] = useState<AddByRSSPodcastPageTabKey>('episodes');
  const [localFeed, setLocalFeed] = useState(feed);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLocalFeed(feed);
    setCurrentPage(1);
  }, [feed]);

  const mappedFeed = localFeed.mappedFeed;
  const mappedChannel = mappedFeed?.channel;
  const feedTitle = mappedChannel?.channel?.title ?? localFeed.title ?? localFeed.feedUrl;
  const feedImageUrl = localFeed.imageUrl ?? mappedChannel?.images?.[0]?.url ?? undefined;
  const feedDescription = mappedChannel?.description?.value ?? null;
  const items = mappedFeed?.items ?? [];
  const itemsPerPage = PAGINATION.DEFAULT_LIMIT;
  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, items, itemsPerPage]);
  const totalPages = useMemo(
    () => getTotalPages(items.length, itemsPerPage, pagedItems.length, currentPage),
    [currentPage, items.length, itemsPerPage, pagedItems.length]
  );
  const handlePageChange = useCallback((page: number) => {
    scrollMainToTop();
    setCurrentPage(page);
  }, []);

  const lastParsedLabel = useMemo(() => {
    if (!localFeed.lastParsedAt) {
      return null;
    }
    const formatted = formatDateTimeAbbrev(localFeed.lastParsedAt, locale);
    return tSettings('feed.last_parsed', { date: formatted });
  }, [localFeed.lastParsedAt, locale, tSettings]);

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

  return (
    <MainWrapper>
      <AddByRSSPodcastHeader feed={localFeed} />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <AddByRSSPodcastPageListHeader
            selectedKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          />
          <DetailListWrapper>
            {activeTab === 'episodes' && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                setPage={handlePageChange}
              >
                <AddByRSSEpisodeNodes
                  feedIdText={localFeed.idText}
                  feedTitle={feedTitle}
                  feedImageUrl={feedImageUrl}
                  items={pagedItems}
                />
              </Pagination>
            )}
            {activeTab === 'about' && feedDescription && (
              <DescriptionRenderer description={feedDescription} />
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
                <LoadingSpinnerOverlay isLoading={isUpdating} />
              </SettingsWrapper>
            )}
          </DetailListWrapper>
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
};
