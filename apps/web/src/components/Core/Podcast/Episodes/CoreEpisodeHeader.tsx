'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { itemHeaderLightboxArtworkCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { itemHeaderSquareArtworkCandidates } from '../../../../utils/image/itemHeaderArtworkCandidates';
import { CommonItemHeader } from '../../../Common/Item/CommonItemHeader';
import { Link } from '../../../Link/Link';
import { CoreEpisodeHeaderPlaySection } from './CoreEpisodeHeaderPlaySection';

import styles from '../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

type CoreEpisodeHeaderProps = {
  item: DTOItem;
  channel: DTOChannel;
};

export const CoreEpisodeHeader: React.FC<CoreEpisodeHeaderProps> = ({ item, channel }) => {
  const tMedia = useTranslations('media');
  const imageCandidates = itemHeaderSquareArtworkCandidates(
    item.item_images,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );
  const imageLightboxCandidates = itemHeaderLightboxArtworkCandidates(item.item_images);

  const titleNode = (
    <Link href={`${ROUTES.EPISODE}/${item.id_text}`}>
      <h2 className={styles.episodeTitle}>{item.title || 'Untitled'}</h2>
    </Link>
  );

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={<CoreEpisodeHeaderPlaySection item={item} channel={channel} />}
      imageCandidates={imageCandidates}
      imageLightboxCandidates={imageLightboxCandidates}
      imageAlt={item.title || tMedia('podcast.episode_image')}
    />
  );
};
