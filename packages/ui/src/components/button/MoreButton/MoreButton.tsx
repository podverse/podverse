'use client';

import classNames from 'classnames';
import type { FC } from 'react';
import { useRef } from 'react';
import { FaEllipsis } from 'react-icons/fa6';

import { useDropdownKeyboardNavigation } from '../../../hooks/useDropdownKeyboardNavigation';
import { cssClass } from '../../../lib/cssModule';
import type { DropdownMenuPanelItem } from '../../navigation/DropdownMenu';
import { DropdownMenuPanel } from '../../navigation/DropdownMenu';

import styles from './MoreButton.module.scss';

export type MoreButtonMenuItem = DropdownMenuPanelItem;

export interface MoreButtonProps {
  ariaLabel: string;
  moreButtonMenuItems: MoreButtonMenuItem[];
  isLarge?: boolean;
  className?: string;
}

export const MoreButton: FC<MoreButtonProps> = ({
  ariaLabel,
  moreButtonMenuItems,
  isLarge = false,
  className,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: moreButtonMenuItems.length,
      onItemSelect: (idx) => moreButtonMenuItems[idx]?.onClick(),
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
    });

  return (
    <div className={classNames(styles.dropdown, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={classNames(styles.button, { [cssClass(styles, 'large')]: isLarge })}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => handleButtonKeyDown(e)}
      >
        <FaEllipsis aria-hidden />
      </button>
      <DropdownMenuPanel
        menuItems={moreButtonMenuItems}
        open={open}
        menuRef={menuRef}
        focusedIndex={focusedIndex}
        setFocusedIndex={setFocusedIndex}
        handleMenuKeyDown={handleMenuKeyDown}
        setOpen={setOpen}
        position="right"
      />
    </div>
  );
};
