'use client';

import classNames from 'classnames';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown } from 'react-icons/fa6';

import { DROPDOWN_ANCHOR_GAP_PX } from '../../../hooks/useAnchoredDropdownPosition';
import { useDropdownKeyboardNavigation } from '../../../hooks/useDropdownKeyboardNavigation';
import { DROPDOWN_VIEWPORT_CLAMP_MARGIN_PX } from '../../../hooks/useDropdownViewportClamp';
import { clampRectToViewportEdges } from '../../../lib/viewport/clampRectToViewportEdges';
import { DropdownMenuContext } from './DropdownMenuContext';
import type { DropdownMenuItemProps } from './DropdownMenuItem';
import { DropdownMenuItem } from './DropdownMenuItem';
import type { DropdownMenuLinkItemProps } from './DropdownMenuLinkItem';
import { DropdownMenuLinkItem } from './DropdownMenuLinkItem';

import styles from './DropdownMenu.module.scss';

export type DropdownMenuProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  /** Optional extra classes on the menu trigger button (merged after shared trigger styles). */
  triggerClassName?: string;
  /** Custom trigger contents (icon + label + chevron, etc.). When omitted, `triggerLabel` + chevron is used. */
  trigger?: ReactNode;
  /** Visible label when using the default trigger (ignored when `trigger` is set). */
  triggerLabel?: string;
};

/** Marker child: body is rendered as a meta/header row above menu items (not in the focus ring list). */
export function DropdownMenuMeta({ children: _children }: { children: ReactNode }) {
  return null;
}

function DropdownMenuRoot({
  ariaLabel,
  children,
  className,
  trigger,
  triggerClassName,
  triggerLabel,
}: DropdownMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);

  const metaBlocks: ReactNode[] = [];
  const itemElements: ReactElement[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    if (child.type === DropdownMenuMeta) {
      metaBlocks.push((child.props as { children?: ReactNode }).children);
      return;
    }
    if (child.type === DropdownMenuItem || child.type === DropdownMenuLinkItem) {
      itemElements.push(child);
    }
  });

  const itemCount = itemElements.length;

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount,
      onItemSelect: (idx) => {
        const ul = menuRef.current;
        if (ul === null) {
          return;
        }
        const row = ul.children.item(idx);
        if (!(row instanceof HTMLElement)) {
          return;
        }
        const target = row.querySelector<HTMLElement>('[role="menuitem"]');
        target?.click();
      },
      onClose: () => {},
      buttonRef: triggerRef,
      insideRef: panelRef,
      menuRef,
    });

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, [setFocusedIndex, setOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  const placePanel = useCallback(() => {
    const button = triggerRef.current;
    const panel = panelRef.current;
    if (button === null || panel === null) {
      return;
    }
    const anchorRect = button.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = anchorRect.right - width;
    const top = anchorRect.bottom + DROPDOWN_ANCHOR_GAP_PX;
    const { dx, dy } = clampRectToViewportEdges(
      { left, top, width, height },
      window.innerWidth,
      window.innerHeight,
      DROPDOWN_VIEWPORT_CLAMP_MARGIN_PX
    );
    const nextTop = top + dy;
    const nextLeft = left + dx;
    setPanelStyle((prev) =>
      prev !== null && prev.top === nextTop && prev.left === nextLeft
        ? prev
        : { top: nextTop, left: nextLeft }
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    placePanel();
  }, [open, itemCount, placePanel]);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener('scroll', placePanel, true);
    window.addEventListener('resize', placePanel);
    return () => {
      window.removeEventListener('scroll', placePanel, true);
      window.removeEventListener('resize', placePanel);
    };
  }, [open, placePanel]);

  const toggleOpen = () => {
    setOpen((prev) => {
      if (prev) {
        setFocusedIndex(-1);
        return false;
      }
      setFocusedIndex(0);
      return true;
    });
  };

  if (trigger === undefined && (triggerLabel === undefined || triggerLabel === '')) {
    throw new Error('DropdownMenu requires either trigger or triggerLabel');
  }

  const menuItems = itemElements.map((el, idx) =>
    // cloneElement cannot infer union props for Item vs LinkItem; inject navigation props only.
    cloneElement(el, {
      focusedIndex,
      key: el.key ?? idx,
      menuIndex: idx,
      setFocusedIndex,
    } as Partial<DropdownMenuItemProps & DropdownMenuLinkItemProps>)
  );

  return (
    <DropdownMenuContext.Provider value={{ close }}>
      <div className={classNames(styles.wrapper, className)}>
        <button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={ariaLabel}
          className={classNames(styles.trigger, triggerClassName)}
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleButtonKeyDown}
        >
          {trigger ?? (
            <>
              <span className={styles.triggerLabel}>{triggerLabel}</span>
              <FaChevronDown aria-hidden className={styles.chevron} />
            </>
          )}
        </button>
        {/* On document.body so an overflow ancestor of the trigger cannot clip the menu. */}
        {open
          ? createPortal(
              <div
                ref={panelRef}
                className={styles.panel}
                role="presentation"
                style={
                  panelStyle === null
                    ? { visibility: 'hidden' }
                    : { top: panelStyle.top, left: panelStyle.left, visibility: 'visible' }
                }
              >
                {metaBlocks.length > 0 ? (
                  <div className={styles.meta} role="presentation">
                    {metaBlocks}
                  </div>
                ) : null}
                <ul
                  ref={menuRef}
                  className={styles.menuList}
                  role="menu"
                  tabIndex={-1}
                  onKeyDown={handleMenuKeyDown}
                >
                  {menuItems}
                </ul>
              </div>,
              document.body
            )
          : null}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Item: DropdownMenuItem,
  LinkItem: DropdownMenuLinkItem,
  Meta: DropdownMenuMeta,
});
