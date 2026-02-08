'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../Item/AddByRSSItemHeaderPlaySection';
import { getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSLivestreamDetailHeaderProps = {
  itemIdText: string;
  title: string;
  mediumSlug: 'podcast' | 'music';
};

export const AddByRSSLivestreamDetailHeader: React.FC<AddByRSSLivestreamDetailHeaderProps> = ({
  itemIdText,
  title,
  mediumSlug,
}) => {
  const tMediaPlayer = useTranslations('media_player');

  const titleNode = (
    <Link href={getAddByRSSLivestreamPath(itemIdText, mediumSlug)}>
      <h2 className={styles.episodeTitle}>{title || 'Untitled'}</h2>
    </Link>
  );

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: alertPlaceholder(tMediaPlayer('play')),
    },
  ];

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={
        <AddByRSSItemHeaderPlaySection
          onPlay={alertPlaceholder(tMediaPlayer('play'))}
          moreButtonMenuItems={moreButtonMenuItems}
        />
      }
    />
  );
};
