'use client';

import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import type { DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import {
  buildDTOChannelImageHeroLoadCandidates,
  buildDTOChannelImageLoadCandidates,
  mergeDTOItemThenChannelImageCandidates,
  mergeDTOItemThenChannelImageHeroCandidates,
} from '@podverse/helpers';
import { ImageLightboxModal, SkeletonFlashImage } from '@podverse/ui';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const target = IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE_FIND_TARGET;
  const comparison = 'lesser' as const;
  const imageCandidates = item
    ? mergeDTOItemThenChannelImageCandidates(
        item.item_images,
        channel.channel_images,
        target,
        comparison
      )
    : buildDTOChannelImageLoadCandidates(channel.channel_images, target, comparison);
  const lightboxCandidates = item
    ? mergeDTOItemThenChannelImageHeroCandidates(
        item.item_images,
        channel.channel_images,
        'largest',
        'greater'
      )
    : buildDTOChannelImageHeroLoadCandidates(channel.channel_images, 'largest', 'greater');

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

  const alt = subtitle ? `${title} - ${subtitle}` : title;
  const canOpenLightbox = imageCandidates.length > 0;

  return (
    <header className={styles.header}>
      {canOpenLightbox ? (
        <button
          aria-label={tMisc('image_preview_dialog')}
          className={styles.imageButton}
          type="button"
          onClick={() => setLightboxOpen(true)}
        >
          <SkeletonFlashImage
            className={styles.image}
            candidates={imageCandidates}
            alt={alt}
            width={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
            height={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
          />
        </button>
      ) : (
        <SkeletonFlashImage
          className={styles.image}
          candidates={imageCandidates}
          alt={alt}
          width={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
          height={IMAGES.MEDIA_HEADER_MINI.SQUARE.SIZE}
        />
      )}
      <div className={styles.textSection}>
        <div className={styles.title}>{title}</div>
        {item && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      <ImageLightboxModal
        alt={alt}
        ariaLabel={tMisc('image_preview_dialog')}
        candidates={lightboxCandidates}
        closeButtonAriaLabel={tMisc('close_modal')}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </header>
  );
};
