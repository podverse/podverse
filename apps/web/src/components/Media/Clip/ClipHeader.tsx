'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { findDTOItemImageBySize } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { Link } from '../../Link/Link';
import { ClipHeaderPlaySection } from './ClipHeaderPlaySection';

import styles from '../../../styles/components/Media/Clip/ClipHeader.module.scss';

type ClipHeaderProps = {
  clip: DTOClip;
  item: DTOItem;
  channel: DTOChannel;
};

export const ClipHeader: React.FC<ClipHeaderProps> = ({ clip, item, channel }) => {
  const tMedia = useTranslations('media');
  const itemImage =
    findDTOItemImageBySize(
      item.item_images,
      IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
      'lesser'
    ) ?? item.item_images?.[0];
  const itemImageUrl = itemImage?.url ?? null;

  const titleNode = (
    <>
      <Link href={`${ROUTES.EPISODE}/${item.id_text}`}>
        <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
      </Link>
      <h3 className={styles.clipTitle}>{clip.title || 'Untitled'}</h3>
    </>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<ClipHeaderPlaySection item={item} channel={channel} clip={clip} />}
      imageUrl={itemImageUrl}
      imageAlt={item.title || tMedia('podcast.episode_image')}
    />
  );
};
