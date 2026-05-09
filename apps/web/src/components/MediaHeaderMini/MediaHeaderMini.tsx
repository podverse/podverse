import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import {
  buildDTOChannelImageHeroLoadCandidates,
  mergeDTOItemThenChannelImageHeroCandidates,
} from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../constants/images';

import styles from '../../styles/components/MediaHeaderMini/MediaHeaderMini.module.scss';

type MediaHeaderMiniProps = {
  channel: DTOChannel;
  item?: DTOItem | null;
  item_soundbite?: DTOItemSoundbite | null;
};

export const MediaHeaderMini: React.FC<MediaHeaderMiniProps> = ({
  channel,
  item,
  item_soundbite,
}) => {
  const tMisc = useTranslations('misc');
  const target = IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE_FIND_TARGET;
  const comparison = 'greater' as const;
  const imageCandidates = item
    ? mergeDTOItemThenChannelImageHeroCandidates(
        item.item_images,
        channel.channel_images,
        target,
        comparison
      )
    : buildDTOChannelImageHeroLoadCandidates(channel.channel_images, target, comparison);

  let title: string;
  let subtitle: string;

  if (item_soundbite?.title) {
    title = item_soundbite.title || tMisc('untitled');
    subtitle = item?.title || tMisc('untitled');
  } else if (item?.title) {
    title = item.title || tMisc('untitled');
    subtitle = channel.title || tMisc('untitled');
  } else {
    title = channel.title || tMisc('untitled');
    subtitle = '';
  }

  return (
    <header className={styles.header}>
      <SkeletonFlashImage
        className={styles.image}
        candidates={imageCandidates}
        alt={subtitle ? `${title} - ${subtitle}` : title}
        width={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
        height={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
      />
      <div className={styles.textSection}>
        <div className={styles.title}>{title}</div>
        {item && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
    </header>
  );
};
