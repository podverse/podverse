'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { FaCircleDollarToSlot, FaCommentDollar, FaGlobe, FaRss } from 'react-icons/fa6';

import {
  appendDistinctImageCandidate,
  buildDTOChannelImageHeroLoadCandidates,
} from '@podverse/helpers';
import { buildAddByRssBoostChannel } from '@podverse/parser-mapping';
import { Button, ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import {
  followAddByRSSChannelAndQueue,
  unfollowAddByRSSChannelAndClear,
} from '../../../../utils/addByRSS/actions';
import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import { addByRSSChannelHeaderTriple } from '../../../../utils/image/addByRSSChannelHeaderCandidates';
import { getBoostEligibilityForContent } from '../../../../utils/value/boostEligibility';
import { CommonAlbumHeader } from '../../../Common/Artist/Album/CommonAlbumHeader';
import { CommonAlbumHeaderViewDesktop } from '../../../Common/Artist/Album/CommonAlbumHeaderViewDesktop';
import { CommonAlbumHeaderViewTablet } from '../../../Common/Artist/Album/CommonAlbumHeaderViewTablet';
import { IconButton } from '../../../Media/Header/IconButton';

import headerButtonsStyles from '../../../../styles/components/Common/Media/Header/HeaderButtons.module.scss';
import subscribeButtonStyles from '../../../../styles/components/Common/Media/Header/SubscribeButton.module.scss';
import imageStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderImage.module.scss';
import headerDesktopStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';
import headerTabletStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSAlbumHeaderProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSAlbumHeader: React.FC<AddByRSSAlbumHeaderProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tInfo = useTranslations('info');
  const tValue = useTranslations('value');
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tMisc = useTranslations('misc');
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired, setModalBoost } = useModals();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const title = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const feedUrl = feed.feedUrl;
  const websiteUrl = feed.mappedFeed?.channel?.about?.website_link_url ?? null;
  const hasFunding = (feed.mappedFeed?.channel?.funding?.length ?? 0) > 0;
  const boostChannel = buildAddByRssBoostChannel(feed);
  const { canShowBoostAction } = getBoostEligibilityForContent({
    channel: boostChannel,
    item: null,
  });
  const channelImages = feed.mappedFeed?.channel?.images;
  const {
    candidatesMobile,
    candidatesTablet,
    candidatesDesktop,
    primaryUrl: imageUrl,
  } = addByRSSChannelHeaderTriple(channelImages, feed.imageUrl);
  const lightboxCandidates = appendDistinctImageCandidate(
    feed.imageUrl ?? undefined,
    buildDTOChannelImageHeroLoadCandidates(channelImages, 'largest', 'greater')
  );
  const detailUrl = `/add-by-rss/album/${feed.idText}`;
  const isSubscribed = loggedInAccount?.account_following_add_by_rss_channels?.some(
    (following) => following.feed_url === feedUrl
  );

  const toggleSubscribe = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({ title: null, message: tInstructions('login_to_subscribe') });
      return;
    }

    setIsUpdating(true);
    try {
      if (isSubscribed) {
        const nextAccount = await unfollowAddByRSSChannelAndClear({
          feedUrl,
          channelIdText: feed.idText,
        });
        setLoggedInAccount(nextAccount);
      } else {
        const { account: nextAccount } = await followAddByRSSChannelAndQueue({
          feedUrl,
          resourceType: 'albums',
          title: title ?? null,
          imageUrl: imageUrl ?? null,
        });
        setLoggedInAccount(nextAccount);
      }
    } catch (error) {
      console.error(error);
      window.alert('Error performing action.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBoostClick = () => {
    if (!boostChannel) {
      alertPlaceholder(tValue('boost'))();
      return;
    }
    setModalBoost({ channel: boostChannel, item: null });
  };

  const buttonsNode = (
    <div className={headerButtonsStyles.buttons}>
      <Button
        className={subscribeButtonStyles.button}
        variant="miniGlow"
        onClick={toggleSubscribe}
        isLoading={isUpdating}
      >
        {isSubscribed ? tFeatures('unsubscribe') : tFeatures('subscribe')}
      </Button>
      {feedUrl && (
        <IconButton
          href={feedUrl}
          target="_blank"
          rel="noopener noreferrer"
          ariaLabel={tInfo('rss_feed')}
          title={tInfo('rss_feed')}
          color="secondary"
        >
          <FaRss />
        </IconButton>
      )}
      {websiteUrl && (
        <IconButton
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          ariaLabel={tInfo('website')}
          title={tInfo('website')}
          color="secondary"
        >
          <FaGlobe />
        </IconButton>
      )}
      {hasFunding && (
        <IconButton
          type="button"
          onClick={alertPlaceholder(tInfo('funding'))}
          ariaLabel={tInfo('funding')}
          title={tInfo('funding')}
          color="secondary"
        >
          <FaCircleDollarToSlot />
        </IconButton>
      )}
      {canShowBoostAction && (
        <IconButton
          type="button"
          onClick={handleBoostClick}
          ariaLabel={tValue('boost')}
          title={tValue('boost')}
          color="secondary"
          isGold
        >
          <FaCommentDollar />
        </IconButton>
      )}
    </div>
  );

  const headerImage = (
    <>
      <button
        aria-label={tMisc('image_preview_dialog')}
        className={imageStyles.headerImageClickable}
        type="button"
        onClick={() => setLightboxOpen(true)}
      >
        <div className={imageStyles.headerImageWrapper}>
          <SkeletonFlashImage
            candidates={candidatesMobile}
            alt={title || tMedia('music.album_image')}
            width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
            height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
            className={imageStyles.mobile}
          />
          <SkeletonFlashImage
            candidates={candidatesTablet}
            alt={title || tMedia('music.album_image')}
            width={IMAGES.HEADER.TABLET.SQUARE.SIZE}
            height={IMAGES.HEADER.TABLET.SQUARE.SIZE}
            className={imageStyles.tablet}
          />
          <SkeletonFlashImage
            candidates={candidatesDesktop}
            alt={title || tMedia('music.album_image')}
            width={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
            height={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
            className={imageStyles.desktop}
          />
        </div>
      </button>
      <ImageLightboxModal
        alt={title || tMedia('music.album_image')}
        ariaLabel={tMisc('image_preview_dialog')}
        candidates={lightboxCandidates}
        closeButtonAriaLabel={tMisc('close_modal')}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );

  const titleNode = (
    <Link className={headerDesktopStyles.titleLink} href={detailUrl}>
      <h1 className={headerDesktopStyles.title}>{title}</h1>
    </Link>
  );

  const titleNodeTablet = (
    <Link className={headerTabletStyles.titleLink} href={detailUrl}>
      <h1 className={headerTabletStyles.title}>{title}</h1>
    </Link>
  );

  const subtitleNode = <>{author && <span>{author}</span>}</>;

  return (
    <CommonAlbumHeader
      desktop={
        <CommonAlbumHeaderViewDesktop
          imageNode={headerImage}
          titleNode={titleNode}
          subtitleNode={subtitleNode}
          buttonsNode={buttonsNode}
        />
      }
      tablet={
        <CommonAlbumHeaderViewTablet
          imageNode={headerImage}
          titleNode={titleNodeTablet}
          subtitleNode={subtitleNode}
          buttonsNode={buttonsNode}
        />
      }
    />
  );
};
