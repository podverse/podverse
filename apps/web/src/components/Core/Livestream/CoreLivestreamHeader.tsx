'use client';

import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import React from 'react';

import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { LivestreamHeaderPlaySection } from '../../Media/Livestream/LivestreamHeaderPlaySection';
import { Link } from '../../Link/Link';
import { ROUTES } from '../../../constants/routes';
import styles from '../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreLivestreamHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
  medium: QueryParamsQueueMedium;
};

export const CoreLivestreamHeader: React.FC<CoreLivestreamHeaderProps> = ({
  item,
  channel,
  medium,
}) => {
  const link =
    medium === 'av'
      ? `${ROUTES.PODCAST_LIVESTREAM}/${item.id_text}`
      : `${ROUTES.MUSIC_LIVESTREAM}/${item.id_text}`;

  const titleNode = (
    <Link href={link}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<LivestreamHeaderPlaySection item={item} channel={channel} />}
    />
  );
};
