'use client';

import classNames from 'classnames';
import React, { useRef } from 'react';
import { FaEllipsis } from 'react-icons/fa6';

import { useDropdownKeyboardNavigation } from '../../hooks/useDropdownKeyboardNavigation';
import { cssClass } from '../../utils/cssModule';
import { DropdownMenu } from '../Dropdown/DropdownMenu';

import styles from '../../styles/components/MoreButton/MoreButton.module.scss';

export interface MoreButtonMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'warning' | 'danger';
}

export interface MoreButtonProps {
  moreButtonMenuItems: MoreButtonMenuItem[];
  isLarge?: boolean;
}

export const MoreButton: React.FC<MoreButtonProps> = ({ moreButtonMenuItems, isLarge = false }) => {
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
    <div className={styles.dropdown}>
      <button
        ref={buttonRef}
        className={classNames(styles.button, { [cssClass(styles, 'large')]: isLarge })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => handleButtonKeyDown(e)}
        type="button"
      >
        <FaEllipsis />
      </button>
      <DropdownMenu
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
