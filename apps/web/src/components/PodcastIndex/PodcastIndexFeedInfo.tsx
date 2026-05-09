'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FaPlus, FaRss } from 'react-icons/fa6';

import type { PodcastByIdFeed } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';
import { Button, ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

import { getContactEmail } from '../../constants/contact';
import { IMAGES } from '../../constants/images';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { dedupedTrimmedUrlCandidates } from '../../utils/image/dedupedTrimmedUrlCandidates';
import {
  getLegacyMembership403ModalProps,
  getMembership403ModalProps,
} from '../../utils/membership/modalForMembership403';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { redirectToChannelPageByMediumClient } from '../../utils/redirect/redirectToChannelPageByMedium';

import styles from '../../styles/components/PodcastIndex/PodcastIndexFeedInfo.module.scss';

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
  const tMembership = useTranslations('membership');
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const feedImageCandidates = dedupedTrimmedUrlCandidates([
    podcastIndexFeed.image,
    podcastIndexFeed.artwork,
  ]);
  const feedImageLightboxCandidates = dedupedTrimmedUrlCandidates([
    podcastIndexFeed.artwork,
    podcastIndexFeed.image,
  ]);
  const description = podcastIndexFeed.description || '';
  const lastUpdateTime = podcastIndexFeed.lastUpdateTime || null;
  const author = podcastIndexFeed.author || null;
  const locale = useLocale();
  const router = useRouter();
  const redirectToChannel = redirectToChannelPageByMediumClient(router);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPollingForChannel = (podcast_index_id: string | number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    const idText = String(podcast_index_id);
    pollIntervalRef.current = setInterval(async () => {
      if (hasRedirectedRef.current) {
        return;
      }
      try {
        const ssrChannel = await apiRequestService.reqChannelGetByPodcastIndexId(idText);
        if (ssrChannel?.medium_id && ssrChannel?.id_text) {
          hasRedirectedRef.current = true;
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          redirectToChannel(ssrChannel.medium_id, ssrChannel.id_text);
        }
      } catch {
        console.warn('Checking for channel...not found yet.');
      }
    }, config.public.polling.interval_ms);
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

    if (podcastIndexFeed?.url && podcastIndexFeed?.id) {
      try {
        await apiRequestService.reqMQRSSAddOnDemand({
          url: podcastIndexFeed.url,
          podcast_index_id: podcastIndexFeed.id,
        });

        startPollingForChannel(podcastIndexFeed.id);
      } catch (error: unknown) {
        const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
        if (!rateLimitErrorHandled) {
          const membershipModal =
            getMembership403ModalProps({
              error,
              contactEmail: getContactEmail(),
              featureContext: 'directory_add_by_rss',
              tMembership,
            }) ?? getLegacyMembership403ModalProps({ error, tMembership });
          if (membershipModal !== null) {
            setModalLoginRequired(membershipModal);
          } else {
            console.error(error);
            alert('Error performing action.');
          }
        }
        setIsLoading(false);
      }
      return;
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.explanation}>{tFeatures('add_feed.add_feed_explanation')}</div>
        <div className={styles.buttonRow}>
          <Button
            variant="primary"
            onClick={addFeedOnClick}
            className={styles.addFeedButton}
            isLoading={isLoading}
          >
            <FaPlus className={styles.buttonIcon} />
            {tFeatures('add_feed.add_feed')}
          </Button>
          <Button
            variant="secondary"
            href={podcastIndexFeed.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rssLinkButton}
          >
            <FaRss className={styles.buttonIcon} />
            {tFeatures('add_feed.rss_link')}
          </Button>
        </div>
      </div>
      {feedImageCandidates.length > 0 && (
        <>
          <button
            aria-label={tMisc('image_preview_dialog')}
            className={styles.imageClickable}
            type="button"
            onClick={() => setLightboxOpen(true)}
          >
            <SkeletonFlashImage
              candidates={feedImageCandidates}
              alt={podcastIndexFeed.title || tMedia('podcast.podcast_image')}
              width={IMAGES.ADD_FEED.SQUARE.SIZE}
              height={IMAGES.ADD_FEED.SQUARE.SIZE}
              className={styles.image}
            />
          </button>
          <ImageLightboxModal
            alt={podcastIndexFeed.title || tMedia('podcast.podcast_image')}
            ariaLabel={tMisc('image_preview_dialog')}
            candidates={feedImageLightboxCandidates}
            closeButtonAriaLabel={tMisc('close_modal')}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      )}
      <h2 className={styles.title}>{podcastIndexFeed.title}</h2>
      <div className={styles.content}>
        {author && <div className={styles.author}>{podcastIndexFeed.author}</div>}
        {lastUpdateTime && (
          <span className={styles.lastUpdateTime}>
            {tMedia('updated_with_date', {
              date: formatDateAbbrev(lastUpdateTime, locale),
            })}
          </span>
        )}
        {description && <div className={styles.description}>{description}</div>}
      </div>
    </div>
  );
};
