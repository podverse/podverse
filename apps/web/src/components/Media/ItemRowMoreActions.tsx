'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOItemEnclosure, EnclosureSelectedParams } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  resolveItemEnclosureModalityIndicator,
} from '@podverse/helpers';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { ItemEnclosureModalityIcon, MoreButton } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';

import styles from '../../styles/components/Media/ItemRowMoreActions.module.scss';

type ItemRowMoreActionsProps = {
  enclosures: DTOItemEnclosure[];
  itemTitle?: string | null;
  ariaLabel: string;
  moreButtonMenuItems: MoreButtonMenuItem[];
  isLarge?: boolean;
  /**
   * Provide when this row's item is NOT the now-playing item: selecting a source
   * loads that item with the chosen enclosure (play). Omit when it is the
   * now-playing item so the in-place enclosure switch (preserving position) runs.
   */
  onLoadInPlayerWithSource?: (params: EnclosureSelectedParams) => void;
};

export const ItemRowMoreActions: React.FC<ItemRowMoreActionsProps> = ({
  enclosures,
  itemTitle,
  ariaLabel,
  moreButtonMenuItems,
  isLarge = false,
  onLoadInPlayerWithSource,
}) => {
  const tMedia = useTranslations('media');
  const { setModalSourceSelector } = useModals();

  const indicator = resolveItemEnclosureModalityIndicator(enclosures);
  const labeledItemEnclosures = buildLabeledItemEnclosures(enclosures);
  const canSelectSource = labeledItemEnclosures.length > 1;

  const iconAriaLabel =
    indicator === 'mixed'
      ? tMedia('enclosure_modality.audio_and_video_available')
      : tMedia('enclosure_modality.video_available');

  const onIconClick = canSelectSource
    ? () =>
        setModalSourceSelector({
          labeledItemEnclosures,
          actionType: 'load-in-player',
          itemTitle: itemTitle ?? null,
          onLoadInPlayerWithSource: onLoadInPlayerWithSource ?? null,
        })
    : undefined;

  return (
    <div className={styles.actions}>
      <ItemEnclosureModalityIcon
        indicator={indicator}
        ariaLabel={canSelectSource ? tMedia('enclosure_modality.select_source') : iconAriaLabel}
        onClick={onIconClick}
        isLarge={isLarge}
      />
      <MoreButton
        ariaLabel={ariaLabel}
        moreButtonMenuItems={moreButtonMenuItems}
        isLarge={isLarge}
      />
    </div>
  );
};
