'use client';

import React from 'react';

import type { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';

import { ROUTES } from '../../../constants/routes';
import { CommonItemHeader } from '../../Common/Item/CommonItemHeader';
import { Link } from '../../Link/Link';
import { LivestreamHeaderPlaySection } from '../../Media/Livestream/LivestreamHeaderPlaySection';

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
