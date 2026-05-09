'use client';

import classNames from 'classnames';
import type { KeyboardEvent, RefObject } from 'react';
import { useMemo, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa6';

import { useDropdownKeyboardNavigation } from '../../../hooks/useDropdownKeyboardNavigation';
import { useDropdownViewportClamp } from '../../../hooks/useDropdownViewportClamp';

import styles from './FormDropdown.module.scss';

export type FormDropdownOption = {
  label: string;
  value: string;
};

export type FormDropdownProps = {
  /** Accessible name when there is no `eyebrow` (e.g. toolbar control with only `ariaLabel`). */
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Optional field title inside the bordered control (same pattern as {@link TextInput} `eyebrow`).
   * Rendered inside the trigger button above the selected value so the caret aligns to full height.
   */
  eyebrow?: string;
  id: string;
  info?: string;
  onChange: (value: string) => void;
  options: FormDropdownOption[];
  /** Menu horizontal alignment relative to the control. */
  position?: 'left' | 'right';
  /** When true, the open menu spans the control width. */
  fullWidth?: boolean;
  value: string;
};

type FormDropdownMenuProps = {
  focusedIndex: number;
  fullWidth: boolean;
  handleMenuKeyDown: (e: KeyboardEvent) => void;
  menuItems: { label: string; onClick: () => void; value: string }[];
  menuRef: RefObject<HTMLUListElement | null>;
  open: boolean;
  position: 'left' | 'right';
  setFocusedIndex: (idx: number) => void;
  setOpen: (open: boolean) => void;
};

function FormDropdownMenu({
  focusedIndex,
  fullWidth,
  handleMenuKeyDown,
  menuItems,
  menuRef,
  open,
  position,
  setFocusedIndex,
  setOpen,
}: FormDropdownMenuProps) {
  const { viewportClampStyle } = useDropdownViewportClamp({
    open,
    menuRef,
    menuItemCount: menuItems.length,
    position,
    fullWidth,
    verticalPosition: 'below',
  });

  if (!open) {
    return null;
  }

  const positionStyle =
    position === 'left' ? { left: 0 } : position === 'right' ? { right: 0 } : { right: 0 };

  const fullWidthStyle = fullWidth ? { width: '100%' } : {};

  const style = {
    ...positionStyle,
    ...fullWidthStyle,
    ...viewportClampStyle,
    top: '100%',
    bottom: 'auto',
    marginBottom: 0,
  };

  return (
    <ul
      ref={menuRef}
      className={classNames(
        styles.dropdownMenu,
        fullWidth ? styles.dropdownMenuFullWidth : undefined
      )}
      role="menu"
      style={style}
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
    >
      {menuItems.map((item, idx) => (
        <li
          key={item.value}
          aria-selected={focusedIndex === idx}
          className={styles.menuItem}
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            item.onClick();
            setOpen(false);
          }}
          onMouseEnter={() => {
            setFocusedIndex(idx);
          }}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function FormDropdown({
  ariaLabel,
  className,
  disabled = false,
  eyebrow,
  id,
  info,
  onChange,
  options,
  position = 'left',
  fullWidth = true,
  value,
}: FormDropdownProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const infoId = info ? `${id}-info` : undefined;
  const eyebrowId = `${id}-eyebrow`;
  const valueDisplayId = `${id}-value`;

  const currentSelectedItem = useMemo(() => {
    return options.find((item) => item.value === value) ?? options[0];
  }, [options, value]);

  const menuItemsWithHandlers = options.map((item) => ({
    label: item.label,
    onClick: () => {
      if (item.value !== value) {
        onChange(item.value);
      }
    },
    value: item.value,
  }));

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: menuItemsWithHandlers.length,
      onItemSelect: (idx) => {
        menuItemsWithHandlers[idx]?.onClick();
      },
      onClose: () => {
        setOpen(false);
      },
      buttonRef,
      menuRef,
    });

  return (
    <div className={classNames(styles.wrapper, className)}>
      <div
        className={classNames(styles.dropdownWrapper, disabled && styles.dropdownWrapperDisabled)}
      >
        <button
          ref={buttonRef}
          aria-describedby={info ? infoId : undefined}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={eyebrow ? undefined : ariaLabel}
          aria-labelledby={eyebrow ? `${eyebrowId} ${valueDisplayId}` : undefined}
          className={styles.dropdownButton}
          disabled={disabled}
          id={id}
          type="button"
          onClick={() => {
            if (!disabled) {
              setOpen((v) => !v);
            }
          }}
          onKeyDown={(e) => {
            if (!disabled) {
              handleButtonKeyDown(e);
            }
          }}
        >
          <span className={styles.dropdownMain}>
            {eyebrow ? (
              <span className={styles.eyebrow} id={eyebrowId}>
                {eyebrow}
              </span>
            ) : null}
            <span className={styles.dropdownSelectedItemText} id={valueDisplayId}>
              {currentSelectedItem?.label}
            </span>
          </span>
          <FaChevronDown aria-hidden className={styles.chevron} />
        </button>
        <FormDropdownMenu
          focusedIndex={focusedIndex}
          fullWidth={fullWidth}
          handleMenuKeyDown={handleMenuKeyDown}
          menuItems={menuItemsWithHandlers}
          menuRef={menuRef}
          open={open}
          position={position}
          setFocusedIndex={setFocusedIndex}
          setOpen={setOpen}
        />
      </div>
      {info ? (
        <div className={styles.formDropdownInfo} id={infoId}>
          {info}
        </div>
      ) : null}
    </div>
  );
}
