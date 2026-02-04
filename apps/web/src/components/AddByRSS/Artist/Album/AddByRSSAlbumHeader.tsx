'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React, { useState } from 'react';
import { FaCircleDollarToSlot, FaCommentDollar, FaGlobe, FaRss } from 'react-icons/fa6';

import { Button } from '../../../Button/Button';
import { Image } from '../../../Image/Image';
import { IconButton } from '../../../Media/Header/IconButton';
import { CommonAlbumHeader } from '../../../Common/Artist/Album/CommonAlbumHeader';
import { CommonAlbumHeaderViewDesktop } from '../../../Common/Artist/Album/CommonAlbumHeaderViewDesktop';
import { CommonAlbumHeaderViewTablet } from '../../../Common/Artist/Album/CommonAlbumHeaderViewTablet';
import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import { IMAGES } from '../../../../constants/images';
import headerDesktopStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewDesktop.module.scss';
import headerTabletStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderViewTablet.module.scss';
import imageStyles from '../../../../styles/components/Common/Media/Podcast/PodcastHeaderImage.module.scss';
import headerButtonsStyles from '../../../../styles/components/Common/Media/Header/HeaderButtons.module.scss';
import subscribeButtonStyles from '../../../../styles/components/Common/Media/Header/SubscribeButton.module.scss';
import {
  unfollowAddByRSSChannelAndClear,
  followAddByRSSChannelAndQueue,
} from '../../../../utils/addByRSS/actions';
import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';

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
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const [isUpdating, setIsUpdating] = useState(false);
  const title = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const feedUrl = feed.feedUrl;
  const websiteUrl = feed.mappedFeed?.channel?.about?.website_link_url ?? null;
  const hasFunding = (feed.mappedFeed?.channel?.funding?.length ?? 0) > 0;
  const hasValue = (feed.mappedFeed?.channel?.value?.length ?? 0) > 0;
  const imageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
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
          feedIdText: feed.idText,
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
      {hasValue && (
        <IconButton
          type="button"
          onClick={alertPlaceholder(tValue('boost'))}
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
    <div className={imageStyles.headerImageWrapper}>
      <Image
        src={imageUrl}
        alt={title || tMedia('music.album_image')}
        width={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        height={IMAGES.HEADER.MOBILE.SQUARE.SIZE}
        className={imageStyles.mobile}
      />
      <Image
        src={imageUrl}
        alt={title || tMedia('music.album_image')}
        width={IMAGES.HEADER.TABLET.SQUARE.SIZE}
        height={IMAGES.HEADER.TABLET.SQUARE.SIZE}
        className={imageStyles.tablet}
      />
      <Image
        src={imageUrl}
        alt={title || tMedia('music.album_image')}
        width={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
        height={IMAGES.HEADER.DESKTOP.SQUARE.SIZE}
        className={imageStyles.desktop}
      />
    </div>
  );

  const titleNode = (
    <Link href={detailUrl}>
      <h1 className={headerDesktopStyles.title}>{title}</h1>
    </Link>
  );

  const titleNodeTablet = (
    <Link href={detailUrl}>
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
