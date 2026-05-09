'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { IMAGES } from '../../../../../constants/images';
import { ROUTES } from '../../../../../constants/routes';
import { itemHeaderSquareArtworkCandidates } from '../../../../../utils/image/itemHeaderArtworkCandidates';
import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { Link } from '../../../../Link/Link';
import { CoreTrackHeaderPlaySection } from './CoreTrackHeaderPlaySection';

import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreTrackHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreTrackHeader: React.FC<CoreTrackHeaderProps> = ({ item, channel }) => {
  const tMedia = useTranslations('media');
  const imageCandidates = itemHeaderSquareArtworkCandidates(
    item.item_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

  const titleNode = (
    <Link href={`${ROUTES.TRACK}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreTrackHeaderPlaySection item={item} channel={channel} />}
      imageCandidates={imageCandidates}
      imageAlt={item.title || tMedia('music.track_image')}
    />
  );
};
