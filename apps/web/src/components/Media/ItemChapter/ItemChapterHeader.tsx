'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { itemHeaderSquareArtworkCandidates } from '../../../utils/image/itemHeaderArtworkCandidates';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { Link } from '../../Link/Link';
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
  const imageCandidates = itemHeaderSquareArtworkCandidates(
    item.item_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

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
      imageCandidates={imageCandidates}
      imageAlt={item.title || tMedia('podcast.episode_image')}
    />
  );
};
