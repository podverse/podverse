'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useEffect, useState } from 'react';

export interface UseDropdownKeyboardNavigationProps {
  itemCount: number;
  onItemSelect: (index: number) => void;
  onClose: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLUListElement | null>;
}

export function useDropdownKeyboardNavigation({
  itemCount,
  onItemSelect,
  onClose: _onClose,
  buttonRef,
  menuRef,
}: UseDropdownKeyboardNavigationProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        (menuRef.current !== null && menuRef.current.contains(target)) ||
        (buttonRef.current !== null && buttonRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [open, buttonRef, menuRef]);

  useEffect(() => {
    if (open && menuRef.current !== null && focusedIndex >= 0) {
      const child = menuRef.current.children.item(focusedIndex);
      if (child instanceof HTMLElement) {
        const target = child.querySelector<HTMLElement>('[role="menuitem"]') ?? child;
        target.focus();
      }
    }
  }, [focusedIndex, open, menuRef]);

  const handleButtonKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      setOpen(true);
      setFocusedIndex(0);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIndex(-1);
      buttonRef.current?.focus();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowDown') {
      setFocusedIndex((i) => (i + 1) % itemCount);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowUp') {
      setFocusedIndex((i) => (i - 1 + itemCount) % itemCount);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      onItemSelect(focusedIndex);
      setOpen(false);
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return {
    open,
    setOpen,
    focusedIndex,
    setFocusedIndex,
    handleButtonKeyDown,
    handleMenuKeyDown,
  };
}
