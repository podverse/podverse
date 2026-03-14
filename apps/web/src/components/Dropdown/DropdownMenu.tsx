import classNames from 'classnames';
import type { RefObject } from 'react';
import React from 'react';

import { cssClass } from '../../utils/cssModule';

import styles from '../../styles/components/Dropdown/DropdownMenu.module.scss';

interface DropdownMenuItemsWithHandlers {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'warning' | 'danger';
}

interface DropdownMenuProps {
  menuItems: DropdownMenuItemsWithHandlers[];
  open: boolean;
  menuRef: RefObject<HTMLUListElement | null>;
  focusedIndex: number;
  setFocusedIndex: (idx: number) => void;
  handleMenuKeyDown: (e: React.KeyboardEvent) => void;
  setOpen: (open: boolean) => void;
  position?: 'left' | 'right';
  fullWidth?: boolean;
  verticalPosition?: 'above' | 'below';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
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
}) => {
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

  const style = { ...positionStyle, ...verticalStyle, ...fullWidthStyle };

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
          className={classNames(styles.menuItem, {
            [cssClass(styles, 'warning')]: item.variant === 'warning',
            [cssClass(styles, 'danger')]: item.variant === 'danger',
          })}
          onClick={() => {
            item.onClick();
            setOpen(false);
          }}
          onMouseEnter={() => setFocusedIndex(idx)}
          aria-selected={focusedIndex === idx}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
};
