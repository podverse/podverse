'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { findDTOItemImageBySize } from '@podverse/helpers';
import React from 'react';
import { useTranslations } from 'next-intl';

import { CommonItemHeader } from '../../../Common/Item/CommonItemHeader';
import { CoreEpisodeHeaderPlaySection } from './CoreEpisodeHeaderPlaySection';
import { Link } from '../../../Link/Link';
import { ROUTES } from '../../../../constants/routes';
import { IMAGES } from '../../../../constants/images';
import styles from '../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreEpisodeHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreEpisodeHeader: React.FC<CoreEpisodeHeaderProps> = ({ item, channel }) => {
  const tMedia = useTranslations('media');
  const itemImage =
    findDTOItemImageBySize(
      item.item_images,
      IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
      'lesser'
    ) ?? item.item_images?.[0];
  const itemImageUrl = itemImage?.url ?? null;

  const titleNode = (
    <Link href={`${ROUTES.EPISODE}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreEpisodeHeaderPlaySection item={item} channel={channel} />}
      imageUrl={itemImageUrl}
      imageAlt={item.title || tMedia('podcast.episode_image')}
    />
  );
};
