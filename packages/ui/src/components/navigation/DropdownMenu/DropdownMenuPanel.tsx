'use client';

import classNames from 'classnames';
import type { KeyboardEvent, RefObject } from 'react';

import { useDropdownViewportClamp } from '../../../hooks/useDropdownViewportClamp';

import styles from './DropdownMenuPanel.module.scss';

export type DropdownMenuPanelItem = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'warning' | 'danger';
  /** When false, selecting the item does not close the menu (default true). */
  dismissOnSelect?: boolean;
};

export type DropdownMenuPanelProps = {
  menuItems: DropdownMenuPanelItem[];
  open: boolean;
  menuRef: RefObject<HTMLUListElement | null>;
  focusedIndex: number;
  setFocusedIndex: (idx: number) => void;
  handleMenuKeyDown: (e: KeyboardEvent) => void;
  setOpen: (open: boolean) => void;
  position?: 'left' | 'right';
  fullWidth?: boolean;
  verticalPosition?: 'above' | 'below';
};

export function DropdownMenuPanel({
  menuItems,
  open,
  menuRef,
  focusedIndex,
  setFocusedIndex,
  handleMenuKeyDown,
  setOpen,
  position,
  fullWidth,
  verticalPosition = 'below',
}: DropdownMenuPanelProps) {
  const { viewportClampStyle } = useDropdownViewportClamp({
    open,
    menuRef,
    menuItemCount: menuItems.length,
    position,
    fullWidth,
    verticalPosition,
  });

  if (!open) {
    return null;
  }

  const positionStyle =
    position === 'left' ? { left: 0 } : position === 'right' ? { right: 0 } : { right: 0 };

  const fullWidthStyle = fullWidth ? { width: '100%' } : {};

  const verticalStyle =
    verticalPosition === 'above'
      ? {
          top: 'auto',
          bottom: '100%',
          marginTop: 0,
          marginBottom: '0.25rem',
        }
      : {
          top: '100%',
          bottom: 'auto',
          marginTop: '0.25rem',
          marginBottom: 0,
        };

  const style = { ...positionStyle, ...verticalStyle, ...fullWidthStyle, ...viewportClampStyle };

  return (
    <ul
      className={styles.dropdownMenu}
      role="menu"
      tabIndex={-1}
      ref={menuRef}
      onKeyDown={handleMenuKeyDown}
      style={style}
    >
      {menuItems.map((item, idx) => (
        <li
          key={item.label}
          role="menuitem"
          tabIndex={-1}
          className={classNames(
            styles.menuItem,
            item.variant === 'warning' ? styles.menuItemWarning : null,
            item.variant === 'danger' ? styles.menuItemDanger : null
          )}
          onClick={() => {
            item.onClick();
            if (item.dismissOnSelect !== false) {
              setOpen(false);
            }
          }}
          onMouseEnter={() => setFocusedIndex(idx)}
          aria-selected={focusedIndex === idx}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
