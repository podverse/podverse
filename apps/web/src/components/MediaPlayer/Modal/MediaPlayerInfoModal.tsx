'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { findDTOChannelImageBySize, findDTOItemImageBySize, MediumEnum } from '@podverse/helpers';
import { useMediaPlayer, type MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import { getAddByRSSItemPath, getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import { ImageNonReact } from '../../Image/ImageNonReact';
import { Link } from '../../Link/Link';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
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

  const channel_image = findDTOChannelImageBySize(
    mpChannel?.channel_images ?? mpAddByRSS?.resourceData?.channel_images,
    'largest'
  );
  const item_image = findDTOItemImageBySize(
    mpItem?.item_images ?? mpAddByRSS?.resourceData?.item_images,
    'largest'
  );
  const defaultImageUrl = item_image?.url || channel_image?.url || undefined;
  const imageUrl = mpItemChapter
    ? mpItemChapter.img || defaultImageUrl || ''
    : defaultImageUrl || '';

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
      </div>
      <div className={styles.imageWrapper}>
        <ImageNonReact
          className={styles.image}
          src={imageUrl}
          alt={tMediaPlayer('media_player_image')}
        />
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
