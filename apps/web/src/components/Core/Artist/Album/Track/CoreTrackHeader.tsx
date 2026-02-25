'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { findDTOItemImageBySize } from '@podverse/helpers';
import React from 'react';
import { useTranslations } from 'next-intl';

import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { CoreTrackHeaderPlaySection } from './CoreTrackHeaderPlaySection';
import { Link } from '../../../../Link/Link';
import { ROUTES } from '../../../../../constants/routes';
import { IMAGES } from '../../../../../constants/images';
import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreTrackHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreTrackHeader: React.FC<CoreTrackHeaderProps> = ({ item, channel }) => {
  const tMedia = useTranslations('media');
  const itemImage =
    findDTOItemImageBySize(
      item.item_images,
      IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
      'lesser'
    ) ?? item.item_images?.[0];
  const itemImageUrl = itemImage?.url ?? null;

  const titleNode = (
    <Link href={`${ROUTES.TRACK}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreTrackHeaderPlaySection item={item} channel={channel} />}
      imageUrl={itemImageUrl}
      imageAlt={item.title || tMedia('music.track_image')}
    />
  );
};
