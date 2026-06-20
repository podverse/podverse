'use client';

import classNames from 'classnames';
import type { FC } from 'react';
import { FaVideo, FaWaveSquare } from 'react-icons/fa6';

import type { ItemEnclosureModalityIndicator } from '@podverse/helpers';

import { cssClass } from '../../../lib/cssModule';

import styles from './ItemEnclosureModalityIcon.module.scss';

export interface ItemEnclosureModalityIconProps {
  indicator: ItemEnclosureModalityIndicator;
  ariaLabel: string;
  onClick?: () => void;
  isLarge?: boolean;
  className?: string;
}

export const ItemEnclosureModalityIcon: FC<ItemEnclosureModalityIconProps> = ({
  indicator,
  ariaLabel,
  onClick,
  isLarge = false,
  className,
}) => {
  if (indicator === 'none') {
    return null;
  }

  const Icon = indicator === 'video' ? FaVideo : FaWaveSquare;
  const iconClassName = classNames(
    styles.icon,
    { [cssClass(styles, 'large')]: isLarge },
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classNames(styles.button, iconClassName)}
        aria-label={ariaLabel}
        data-testid="item-enclosure-modality-icon"
        data-indicator={indicator}
        onClick={onClick}
      >
        <Icon aria-hidden />
      </button>
    );
  }

  return (
    <span
      className={iconClassName}
      role="img"
      aria-label={ariaLabel}
      data-testid="item-enclosure-modality-icon"
      data-indicator={indicator}
    >
      <Icon aria-hidden />
    </span>
  );
};
