'use client';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { findDTOItemImageBySize } from '@podverse/helpers';
import React from 'react';
import { useTranslations } from 'next-intl';

import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import { IMAGES } from '../../../constants/images';
import { ItemChapterHeaderPlaySection } from './ItemChapterHeaderPlaySection';
import styles from '../../../styles/components/Media/ItemChapter/ItemChapterHeader.module.scss';

type ItemChapterHeaderProps = {
  channel: DTOChannel;
  item: DTOItem;
  item_chapter: DTOItemChapter;
};

export const ItemChapterHeader: React.FC<ItemChapterHeaderProps> = ({
  item_chapter,
  item,
  channel,
}) => {
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
      <h3 className={styles.officialItemChapterTitle}>{item_chapter.title || 'Untitled'}</h3>
    </>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={
        <ItemChapterHeaderPlaySection item={item} channel={channel} item_chapter={item_chapter} />
      }
      imageUrl={itemImageUrl}
      imageAlt={item.title || tMedia('podcast.episode_image')}
    />
  );
};
