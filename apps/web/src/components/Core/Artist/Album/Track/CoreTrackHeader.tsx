'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';

import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { CoreTrackHeaderPlaySection } from './CoreTrackHeaderPlaySection';
import { Link } from '../../../../Link/Link';
import { ROUTES } from '../../../../../constants/routes';
import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreTrackHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreTrackHeader: React.FC<CoreTrackHeaderProps> = ({ item, channel }) => {
  const titleNode = (
    <Link href={`${ROUTES.TRACK}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreTrackHeaderPlaySection item={item} channel={channel} />}
    />
  );
};
