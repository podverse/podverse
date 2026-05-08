'use client';

import type { FC } from 'react';
import { useMemo, useRef } from 'react';

import { useDropdownKeyboardNavigation } from '../../../hooks/useDropdownKeyboardNavigation';
import { Button } from '../../button/Button/Button';
import { DropdownMenuPanel } from '../DropdownMenu/DropdownMenuPanel';

import styles from './Dropdown.module.scss';

/** Option row for toolbar/filter-style dropdowns (`param` is for URL/query wiring at call sites). */
export interface DropdownOption {
  label: string;
  param: string;
  value: string;
}

export interface DropdownProps {
  menuItems: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  position?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Dropdown: FC<DropdownProps> = ({
  menuItems,
  value,
  onChange,
  position,
  fullWidth,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const currentSelectedItem = useMemo(() => {
    return menuItems.find((item) => item.value === value) || menuItems[0];
  }, [menuItems, value]);

  const menuItemsWithHandlers = menuItems.map((item) => ({
    label: item.label,
    onClick: () => onChange(item.value),
  }));

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: menuItemsWithHandlers.length,
      onItemSelect: (idx) => menuItemsWithHandlers[idx]?.onClick(),
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
    });

  const hasMoreThanOneOption = menuItemsWithHandlers.length > 1;

  return (
    <div className={styles.dropdown}>
      <Button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => hasMoreThanOneOption && setOpen((v) => !v)}
        onKeyDown={(e) => hasMoreThanOneOption && handleButtonKeyDown(e)}
        type="button"
        variant="mini"
        isDropdownButton={hasMoreThanOneOption}
      >
        {currentSelectedItem?.label}
      </Button>
      <DropdownMenuPanel
        menuItems={menuItemsWithHandlers}
        open={open}
        menuRef={menuRef}
        focusedIndex={focusedIndex}
        setFocusedIndex={setFocusedIndex}
        handleMenuKeyDown={handleMenuKeyDown}
        setOpen={setOpen}
        position={position}
        fullWidth={fullWidth}
      />
    </div>
  );
};
