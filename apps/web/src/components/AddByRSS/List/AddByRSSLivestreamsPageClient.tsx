'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import type { AddByRSSParseStatus } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { AddByRSSLivestreamNodes } from '../../../components/AddByRSS/Livestream/AddByRSSLivestreamNodes';
import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import type { MediaListChipsConfig } from '../../../components/MediaListChips/MediaListChips';
import { NoResults } from '../../../components/NoResults/NoResults';
import { dismissToast, showToast, showToastLoading } from '../../../components/Toast/Toast';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useUpcomingAddByRSSLivestreams } from '../../../hooks/useUpcomingAddByRSSLivestreams';
import type { AddByRSSParseOutcome } from '../../../utils/addByRSS/actions';
import { applyAddByRSSParseStatus } from '../../../utils/addByRSS/actions';
import { runAddByRSSParseAll } from '../../../utils/addByRSS/parseAll';
import { getAllAddByRSSFeeds } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord, AddByRSSParsedFeed } from '../../../utils/addByRSS/types';
import { AddByRSSListHeader, AddByRSSListToolbar } from './AddByRSSListHeader';

type AddByRSSLivestreamsPageClientProps = {
  chipsConfig: MediaListChipsConfig;
};

export const AddByRSSLivestreamsPageClient: React.FC<AddByRSSLivestreamsPageClientProps> = ({
  chipsConfig,
}) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { items, isReady } = useUpcomingAddByRSSLivestreams(!!loggedInAccount);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSParseStatus,
      cache?: AddByRSSFeedRecord['cache'],
      outcome?: AddByRSSParseOutcome
    ) => {
      await applyAddByRSSParseStatus({
        feedUrl,
        parsedFeed,
        status,
        cache,
        outcome,
      });
    },
    []
  );

  const handleCheckForUpdates = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    let toastId: string | Promise<string> | null = null;
    const timer = setTimeout(() => {
      toastId = showToastLoading(tMisc('loading'));
    }, 250);
    const stopLoadingToast = () => {
      clearTimeout(timer);
      if (toastId) {
        dismissToast(toastId);
      }
    };

    try {
      const allFeeds = await getAllAddByRSSFeeds();
      const result = await runAddByRSSParseAll({
        accountId: loggedInAccount.id_text,
        feeds: allFeeds,
        onQueued: async (feedUrl) => handleParseStatus(feedUrl, undefined, 'queued'),
        onStatusUpdate: async (feedUrl, statusResponse) =>
          handleParseStatus(
            feedUrl,
            statusResponse.payload,
            statusResponse.status,
            statusResponse.cache,
            statusResponse
          ),
      });

      if (result.dedupedFeedUrls.length > 0 && result.dedupeTtlSeconds) {
        const minutes = Math.max(1, Math.ceil(result.dedupeTtlSeconds / 60));
        const waitKey =
          minutes === 1 ? 'add_by_rss.wait_to_retry_minute' : 'add_by_rss.wait_to_retry_minutes';
        showToast(tFeatures(waitKey, { minutes }), 'warning');
      } else {
        showToast(tMisc('done'), 'success');
      }
    } catch (error) {
      showToast(tFeatures('add_by_rss.status_failed'), 'error');
      console.error(error);
    } finally {
      stopLoadingToast();
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, setModalAuthLogin, tFeatures, tMisc]);

  return (
    <>
      <AddByRSSListHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AddByRSSListToolbar
              chipsConfig={chipsConfig}
              isUpdating={isUpdating}
              onCheckUpdates={handleCheckForUpdates}
            />
            {isReady && items.length > 0 ? (
              <AddByRSSLivestreamNodes items={items} viewSelected="rows" showChannelInfo />
            ) : isReady ? (
              <NoResults message={tMedia('livestream.no_livestreams_found')} />
            ) : null}
            <WebLoadingSpinnerOverlay isLoading={Boolean(loggedInAccount) && !isReady} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
