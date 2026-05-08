'use client';

import classNames from 'classnames';
import type { MouseEvent, ReactNode } from 'react';
import { useContext } from 'react';

import { DropdownMenuContext } from './DropdownMenuContext';

import styles from './DropdownMenu.module.scss';

export type DropdownMenuItemVariant = 'default' | 'warning' | 'danger';

export type DropdownMenuItemProps = {
  children: ReactNode;
  className?: string;
  focusedIndex?: number;
  menuIndex?: number;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  setFocusedIndex?: (index: number) => void;
  variant?: DropdownMenuItemVariant;
};

export function DropdownMenuItem({
  children,
  className,
  focusedIndex,
  menuIndex = 0,
  onClick,
  setFocusedIndex,
  variant = 'default',
}: DropdownMenuItemProps) {
  const ctx = useContext(DropdownMenuContext);

  return (
    <li className={styles.menuRow} onMouseEnter={() => setFocusedIndex?.(menuIndex)}>
      <button
        aria-selected={focusedIndex === menuIndex}
        className={classNames(
          styles.item,
          variant === 'danger' ? styles.itemDanger : null,
          variant === 'warning' ? styles.itemWarning : null,
          className
        )}
        type="button"
        role="menuitem"
        onClick={(event) => {
          onClick?.(event);
          ctx?.close();
        }}
      >
        {children}
      </button>
    </li>
  );
}
