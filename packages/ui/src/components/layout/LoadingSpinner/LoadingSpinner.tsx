import classNames from 'classnames';
import type { CSSProperties } from 'react';
import { FaSpinner } from 'react-icons/fa6';

import styles from './LoadingSpinner.module.scss';

const SIZE_PX = {
  small: 18,
  medium: 32,
  large: 48,
} as const;

export type LoadingSpinnerSize = 'inline' | keyof typeof SIZE_PX;

export type LoadingSpinnerProps = {
  size?: LoadingSpinnerSize;
  /** When not `aria-hidden`, sets the accessible name for the spinner. */
  ariaLabel?: string;
  /** When true, the spinner is presentational (`aria-hidden`). */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
};

function shouldHideFromAssistiveTech(props: {
  ariaLabel: string | undefined;
  decorative: boolean | undefined;
  size: LoadingSpinnerSize;
}): boolean {
  const { ariaLabel, decorative, size } = props;
  if (decorative === true) {
    return true;
  }
  if (size === 'inline' && (ariaLabel === undefined || ariaLabel === '')) {
    return true;
  }
  if (size !== 'inline' && (ariaLabel === undefined || ariaLabel === '')) {
    return true;
  }
  return false;
}

export function LoadingSpinner({
  size = 'medium',
  ariaLabel,
  decorative,
  className,
  style,
}: LoadingSpinnerProps) {
  const ariaHidden = shouldHideFromAssistiveTech({
    ariaLabel,
    decorative,
    size,
  });

  const px = size === 'inline' ? undefined : SIZE_PX[size];

  return (
    <FaSpinner
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : ariaLabel}
      className={classNames(styles.root, size === 'inline' && styles.inline, className)}
      size={px}
      style={style}
    />
  );
}
