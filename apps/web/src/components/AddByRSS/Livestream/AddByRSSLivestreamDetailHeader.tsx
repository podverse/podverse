'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import type { AddByRSSLivestreamIndexItem } from '../../../utils/addByRSS/types';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';

import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';
import playSectionStyles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeaderPlaySection.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSLivestreamDetailHeaderProps = {
  itemIdText: string;
  title: string;
  mediumSlug: 'podcast' | 'music';
  indexItem?: AddByRSSLivestreamIndexItem | null;
};

export const AddByRSSLivestreamDetailHeader: React.FC<AddByRSSLivestreamDetailHeaderProps> = ({
  itemIdText,
  title,
  mediumSlug,
  indexItem,
}) => {
  const tMediaPlayer = useTranslations('media_player');
  const { mpAddByRSS, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const playAddByRSS = usePlayAddByRSS();

  const togglePlay = () => {
    if (indexItem && mpAddByRSS?.idText === indexItem.idText) {
      setMPIsPlaying(!mpIsPlaying);
    } else if (indexItem) {
      playAddByRSS(indexItem);
    } else {
      alertPlaceholder(tMediaPlayer('play'))();
    }
  };

  const titleNode = (
    <Link href={getAddByRSSLivestreamPath(itemIdText, mediumSlug)}>
      <h2 className={styles.episodeTitle}>{title || 'Untitled'}</h2>
    </Link>
  );

  const playSectionNode = (
    <div className={playSectionStyles.playSection}>
      <div className={playSectionStyles.sectionStart}>
        <PlayButtonLarge addByRSSIdText={indexItem?.idText} onClick={togglePlay} />
        <div className={playSectionStyles.timeSection} />
      </div>
    </div>
  );

  return <CommonItemHeader titleNode={titleNode} playSectionNode={playSectionNode} />;
};
