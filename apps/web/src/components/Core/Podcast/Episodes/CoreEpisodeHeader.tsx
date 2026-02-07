'use client';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import React from 'react';

import { CommonItemHeader } from '../../../Common/Item/CommonItemHeader';
import { CoreEpisodeHeaderPlaySection } from './CoreEpisodeHeaderPlaySection';
import { Link } from '../../../Link/Link';
import { ROUTES } from '../../../../constants/routes';
import styles from '../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreEpisodeHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreEpisodeHeader: React.FC<CoreEpisodeHeaderProps> = ({ item, channel }) => {
  const titleNode = (
    <Link href={`${ROUTES.EPISODE}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreEpisodeHeaderPlaySection item={item} channel={channel} />}
    />
  );
};
