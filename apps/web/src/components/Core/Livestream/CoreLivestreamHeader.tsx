'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import { itemHeaderLightboxArtworkCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { itemHeaderSquareArtworkCandidates } from '../../../utils/image/itemHeaderArtworkCandidates';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { Link } from '../../Link/Link';
import { LivestreamHeaderPlaySection } from '../../Media/Livestream/LivestreamHeaderPlaySection';

import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreLivestreamHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
  medium: QueryParamsQueueMedium;
};

export const CoreLivestreamHeader: React.FC<CoreLivestreamHeaderProps> = ({
  item,
  channel,
  medium,
}) => {
  const tMedia = useTranslations('media');
  const link =
    medium === 'av'
      ? `${ROUTES.PODCAST_LIVESTREAM}/${item.id_text}`
      : `${ROUTES.MUSIC_LIVESTREAM}/${item.id_text}`;
  const imageCandidates = itemHeaderSquareArtworkCandidates(
    item.item_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const imageLightboxCandidates = itemHeaderLightboxArtworkCandidates(item.item_images);

  const titleNode = (
    <Link href={link}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<LivestreamHeaderPlaySection item={item} channel={channel} />}
      imageCandidates={imageCandidates}
      imageLightboxCandidates={imageLightboxCandidates}
      imageAlt={item.title || tMedia('livestream.livestream_image')}
    />
  );
};
