'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useEffect, useState } from 'react';

export interface UseDropdownKeyboardNavigationProps {
  itemCount: number;
  onItemSelect: (index: number) => void;
  onClose: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLUListElement | null>;
  /** Extra root treated as inside the menu, such as a portaled panel around the list. */
  insideRef?: RefObject<HTMLElement | null>;
  /** When false, Enter/Space on a menu item does not close the menu (default true). */
  closeOnItemSelect?: boolean;
}

export function useDropdownKeyboardNavigation({
  itemCount,
  onItemSelect,
  onClose: _onClose,
  buttonRef,
  menuRef,
  insideRef,
  closeOnItemSelect = true,
}: UseDropdownKeyboardNavigationProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      const inside = insideRef?.current ?? null;
      if (
        !(target instanceof Node) ||
        (menuRef.current !== null && menuRef.current.contains(target)) ||
        (inside !== null && inside.contains(target)) ||
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
  }, [open, buttonRef, insideRef, menuRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    // A click leaves focus on the trigger, so Escape has to close the menu before it reaches
    // the row handler. preventDefault keeps a dialog behind the menu from dismissing too.
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      setOpen(false);
      setFocusedIndex(-1);
      buttonRef.current?.focus();
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open, buttonRef, setFocusedIndex, setOpen]);

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
      if (closeOnItemSelect) {
        setOpen(false);
      }
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
