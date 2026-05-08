import type { KeyboardEvent, MouseEvent } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import styles from './NavArrowButton.module.scss';

export type NavArrowButtonProps = {
  direction: 'left' | 'right';
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Required for accessibility — localize in the app (e.g. pagination prev/next). */
  ariaLabel: string;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

export function NavArrowButton({
  direction,
  onClick,
  disabled,
  ariaLabel,
  className = '',
  onKeyDown,
}: NavArrowButtonProps) {
  return (
    <button
      className={`${styles.navButton} ${direction === 'left' ? styles.navButtonLeft : styles.navButtonRight} ${className}`.trim()}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {direction === 'left' ? <FaChevronLeft /> : <FaChevronRight />}
    </button>
  );
}
