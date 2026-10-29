'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FaCirclePlus } from 'react-icons/fa6';

import type { PodcastByIdFeed } from '@podverse/helpers';
import {
  dedupedTrimmedUrlCandidates,
  DIRECTORY_ADD_POLL_TIMEOUT_MS,
  formatDateAbbrev,
} from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { redirectToChannelPageByMediumClient } from '../../utils/redirect/redirectToChannelPageByMedium';
import { SearchDetail } from '../SearchDetail/SearchDetail';

type PodcastIndexFeedInfoProps = {
  podcastIndexFeed: PodcastByIdFeed;
};

export const PodcastIndexFeedInfo: React.FC<PodcastIndexFeedInfoProps> = ({ podcastIndexFeed }) => {
  const config = useConfig();
  const apiRequestService = getApiRequestService();
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const tInstructions = useTranslations('instructions');
  const [isLoading, setIsLoading] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const feedImageCandidates = dedupedTrimmedUrlCandidates([
    podcastIndexFeed.image,
    podcastIndexFeed.artwork,
  ]);
  const feedImageLightboxCandidates = dedupedTrimmedUrlCandidates([
    podcastIndexFeed.artwork,
    podcastIndexFeed.image,
  ]);
  const lastUpdateTime = podcastIndexFeed.lastUpdateTime || null;
  const locale = useLocale();
  const router = useRouter();
  const redirectToChannel = redirectToChannelPageByMediumClient(router);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRedirectedRef = useRef(false);
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  const startPollingForChannel = (podcast_index_id: string | number) => {
    clearPolling();
    hasRedirectedRef.current = false;
    setPollTimedOut(false);

    const idText = String(podcast_index_id);
    pollIntervalRef.current = setInterval(async () => {
      if (hasRedirectedRef.current) {
        return;
      }
      try {
        const ssrChannel = await apiRequestService.reqChannelGetByPodcastIndexId(idText);
        if (ssrChannel?.medium_id && ssrChannel?.id_text) {
          hasRedirectedRef.current = true;
          clearPolling();
          redirectToChannel(ssrChannel.medium_id, ssrChannel.id_text);
        }
      } catch {
        console.warn('Checking for channel...not found yet.');
      }
    }, config.public.polling.interval_ms);

    pollTimeoutRef.current = setTimeout(() => {
      if (hasRedirectedRef.current) {
        return;
      }
      clearPolling();
      setIsLoading(false);
      setPollTimedOut(true);
    }, DIRECTORY_ADD_POLL_TIMEOUT_MS);
  };

  const addFeedOnClick = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_add_feeds'),
      });
      return;
    }

    setIsLoading(true);
    setPollTimedOut(false);

    if (podcastIndexFeed?.url && podcastIndexFeed?.id) {
      try {
        await apiRequestService.reqMQRSSAddOnDemand({
          url: podcastIndexFeed.url,
          podcast_index_id: podcastIndexFeed.id,
        });

        startPollingForChannel(podcastIndexFeed.id);
      } catch (error: unknown) {
        const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
        if (
          !rateLimitErrorHandled &&
          !tryHandleMembershipGateError(error, { featureContext: 'directory_add_by_rss' })
        ) {
          console.error(error);
          alert('Error performing action.');
        }
        setIsLoading(false);
      }
      return;
    }
  };

  return (
    <SearchDetail
      explanation={tFeatures('add_feed.add_feed_explanation')}
      primaryAction={{
        label: tFeatures('add_feed.add_feed'),
        icon: <FaCirclePlus />,
        isLoading,
        onClick: addFeedOnClick,
      }}
      rssHref={podcastIndexFeed.url || null}
      statusMessage={pollTimedOut ? tFeatures('add_feed.add_feed_timed_out') : null}
      errorMessage={null}
      imageUrls={feedImageCandidates}
      imageLightboxUrls={feedImageLightboxCandidates}
      imageAlt={podcastIndexFeed.title || tMedia('podcast.podcast_image')}
      title={podcastIndexFeed.title}
      author={podcastIndexFeed.author || null}
      updatedLabel={
        lastUpdateTime
          ? tMedia('updated_with_date', { date: formatDateAbbrev(lastUpdateTime, locale) })
          : null
      }
      description={podcastIndexFeed.description || null}
    />
  );
};
