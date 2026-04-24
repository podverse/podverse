'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { findDTOChannelImageBySize, findDTOItemImageBySize, MediumEnum } from '@podverse/helpers';

import { type MediaPlayerAddByRSSState, useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { getAddByRSSItemPath, getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import { getResolvedVtsLikeTargetItem } from '../../../utils/mediaPlayer/vtsOverrideLikeItem';
import { ImageNonReact } from '../../Image/ImageNonReact';
import { Link } from '../../Link/Link';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { MediaPlayerVtsOverrideLikeButton } from './MediaPlayerVtsOverrideLikeButton';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerInfoModal.module.scss';

type UseLinkHelperParams = {
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  mpClip: DTOClip | null;
  mpItemChapter: DTOItemChapter | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpAddByRSS: MediaPlayerAddByRSSState;
};

function useLinkHelper({
  mpChannel,
  mpItem,
  mpClip,
  mpItemChapter,
  mpItemSoundbite,
  mpAddByRSS,
}: UseLinkHelperParams) {
  let channelLinkUrl = '';
  let itemLinkUrl = '';
  let subsectionUrl = '';

  if (mpAddByRSS) {
    const { idText, resourceData } = mpAddByRSS;
    const mediumId = resourceData.medium_id as number | undefined;
    if (resourceData.start_time !== null && resourceData.start_time !== undefined) {
      const mediumSlug = mediumId === MediumEnum.Music ? 'music' : 'podcast';
      itemLinkUrl = getAddByRSSLivestreamPath(idText, mediumSlug);
    } else {
      itemLinkUrl =
        mediumId === MediumEnum.Music
          ? getAddByRSSItemPath(idText, 'tracks')
          : getAddByRSSItemPath(idText, 'episodes');
    }
  } else if (mpChannel?.medium_id) {
    if (mpChannel.medium_id === MediumEnum.Podcast || mpChannel.medium_id === MediumEnum.Video) {
      channelLinkUrl = `/podcast/${mpChannel.id_text}`;
      if (mpItem) {
        itemLinkUrl = `/episode/${mpItem.id_text}`;
      }
    } else if (mpChannel.medium_id === MediumEnum.Music) {
      channelLinkUrl = `/album/${mpChannel.id_text}`;
      if (mpItem) {
        itemLinkUrl = `/track/${mpItem.id_text}`;
      }
    }
  }

  if (mpClip) {
    subsectionUrl = `/clip/${mpClip.id_text}`;
  } else if (mpItemSoundbite) {
    subsectionUrl = `/official-clip/${mpItemSoundbite.id_text}`;
  } else if (mpItemChapter) {
    subsectionUrl = `/chapter/${mpItemChapter.id_text}`;
  }

  return { channelLinkUrl, itemLinkUrl, subsectionUrl };
}

function ClickableTitle({
  title,
  onClick,
  className,
  children,
  setPlayerModalIsOpen,
}: {
  title?: string | null;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  setPlayerModalIsOpen: (isOpen: boolean) => void;
}) {
  const tMisc = useTranslations('misc');

  const handleOnClick = () => {
    setPlayerModalIsOpen(false);
    onClick();
  };

  return (
    <div className={className || ''}>
      <Link onClick={handleOnClick}>{children || title || tMisc('untitled')}</Link>
    </div>
  );
}

export const MediaPlayerInfoModal: React.FC = () => {
  const {
    mpChannel,
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemChapter,
    mpItemSoundbite,
    setPlayerModalIsOpen,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');
  const router = useRouter();

  const { channelLinkUrl, itemLinkUrl, subsectionUrl } = useLinkHelper({
    mpChannel,
    mpItem,
    mpClip,
    mpItemChapter,
    mpItemSoundbite,
    mpAddByRSS,
  });

  const channelImagesSource =
    mpChannel?.channel_images ??
    mpItem?.channel?.channel_images ??
    mpAddByRSS?.resourceData?.channel_images;
  const itemImagesSource = mpItem?.item_images ?? mpAddByRSS?.resourceData?.item_images;

  const channel_image = findDTOChannelImageBySize(channelImagesSource, 'largest');
  const item_image = findDTOItemImageBySize(itemImagesSource, 'largest');
  const inChapterContextForArt = Boolean(mpItemChapter && !mpClip && !mpItemSoundbite);
  const chapterImageUrl = typeof mpItemChapter?.img === 'string' ? mpItemChapter.img.trim() : '';
  const artImageCandidates = useMemo(() => {
    const urls: string[] = [];
    if (inChapterContextForArt && chapterImageUrl) {
      urls.push(chapterImageUrl);
    }
    if (item_image?.url) {
      const u = String(item_image.url).trim();
      if (u) {
        urls.push(u);
      }
    }
    if (channel_image?.url) {
      const u = String(channel_image.url).trim();
      if (u) {
        urls.push(u);
      }
    }
    return urls.filter((u, i, a) => a.indexOf(u) === i);
  }, [inChapterContextForArt, chapterImageUrl, item_image?.url, channel_image?.url]);

  const itemTitle =
    (typeof mpAddByRSS?.resourceData?.title === 'string' ? mpAddByRSS.resourceData.title : null) ??
    mpItem?.title ??
    null;
  const channelTitle =
    (typeof mpAddByRSS?.resourceData?.channel_title === 'string'
      ? mpAddByRSS.resourceData.channel_title
      : null) ??
    mpChannel?.title ??
    null;

  const vtsOverrideLikeItem = mpItem && getResolvedVtsLikeTargetItem(mpItem, mpCurrentTime);

  return (
    <div className={styles.info}>
      <div className={styles.titleSection}>
        <ClickableTitle
          title={itemTitle ?? undefined}
          className={styles.itemTitle}
          onClick={() => itemLinkUrl && router.push(itemLinkUrl)}
          setPlayerModalIsOpen={setPlayerModalIsOpen}
        />
        {channelLinkUrl ? (
          <ClickableTitle
            title={channelTitle ?? undefined}
            className={styles.channelTitle}
            onClick={() => router.push(channelLinkUrl)}
            setPlayerModalIsOpen={setPlayerModalIsOpen}
          />
        ) : channelTitle ? (
          <div className={styles.channelTitle}>{String(channelTitle)}</div>
        ) : null}
        {vtsOverrideLikeItem && (
          <div className={styles.vtsLike}>
            <MediaPlayerVtsOverrideLikeButton likeTarget={vtsOverrideLikeItem} />
          </div>
        )}
      </div>
      <div className={styles.imageWrapper}>
        <div className={styles.imageInner}>
          <ImageNonReact
            className={styles.image}
            candidates={artImageCandidates}
            alt={tMediaPlayer('media_player_image')}
          />
        </div>
      </div>
      <div className={styles.subtitleSection}>
        {mpClip && (
          <>
            <ClickableTitle
              title={mpClip.title}
              className={styles.subtitle}
              onClick={() => router.push(subsectionUrl)}
              setPlayerModalIsOpen={setPlayerModalIsOpen}
            />
            <div className={styles.timeRange}>
              <ReadableTimeRange startTime={mpClip?.start_time} endTime={mpClip?.end_time} />
            </div>
          </>
        )}
        {mpItemSoundbite && (
          <>
            <ClickableTitle
              title={mpItemSoundbite.title}
              className={styles.subtitle}
              onClick={() => router.push(subsectionUrl)}
              setPlayerModalIsOpen={setPlayerModalIsOpen}
            />
            <div className={styles.timeRange}>
              <ReadableTimeRange
                startTime={mpItemSoundbite?.start_time}
                endTime={`${Number(mpItemSoundbite.start_time) + Number(mpItemSoundbite.duration)}`}
              />
            </div>
          </>
        )}
        {mpItemChapter && !mpClip && !mpItemSoundbite && (
          <>
            <ClickableTitle
              title={mpItemChapter.title}
              className={styles.subtitle}
              onClick={() => router.push(subsectionUrl)}
              setPlayerModalIsOpen={setPlayerModalIsOpen}
            />
            <div className={styles.timeRange}>
              <ReadableTimeRange
                startTime={mpItemChapter?.start_time}
                endTime={mpItemChapter?.end_time}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
