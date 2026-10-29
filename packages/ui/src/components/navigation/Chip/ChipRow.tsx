'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { getChipRevealOffset } from '@podverse/helpers/chipRowReveal';

import { HorizontalDragScroller } from '../../layout/HorizontalDragScroller/HorizontalDragScroller';
import { Chip } from './Chip';

import styles from './ChipRow.module.scss';

export type ChipRowItem<T extends string> = {
  key: T;
  label: string;
  /** Hidden from 1200px up. The side column shows this section there. */
  hideDesktop?: boolean;
};

export type ChipRowProps<T extends string> = {
  items: readonly ChipRowItem<T>[];
  /** `null` when no item is the current selection. */
  selectedKey: T | null;
  onSelect: (key: T) => void;
  /** Category, Sort, then the gear. Mount each only when the current item can use it. */
  trailing?: ReactNode;
  /** Names the group of items for assistive tech. */
  ariaLabel?: string;
  className?: string;
  /** Root gets it; items get `${testId}-items`, each chip `${testId}-${key}`, trailing `${testId}-trailing`. */
  testId?: string;
  /**
   * Rows with the same key share one remembered horizontal offset in this tab. A row that mounts
   * with a remembered offset resumes it, and a chip pressed with keyboard focus just before the
   * row remounts gets focus back.
   */
  memoryKey?: string;
  /** Keeps the trailing controls' space but hides them and takes them out of the focus order. */
  trailingHidden?: boolean;
};

type ChipRowMemory = { scrollLeft: number; focusKey: string | null };

/** Read and written only in effects and event handlers, so a server render never touches it. */
const chipRowMemory = new Map<string, ChipRowMemory>();

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * One line of pill chips that scrolls sideways when it does not fit, with the trailing controls
 * after the chips inside the same scroller. The selected chip is scrolled fully into view on mount
 * (a jump) and on every selection change (animated unless reduced motion is requested). With a
 * `memoryKey`, a remounted row resumes its remembered offset and focus, and the reveal on that
 * mount is animated. A swipe afterwards is left alone. Overflow scrolls through
 * `HorizontalDragScroller`: hidden scrollbar, mouse or pen drag, and a drag that does not activate
 * the chip or a trailing control.
 */
export function ChipRow<T extends string>({
  items,
  selectedKey,
  onSelect,
  trailing,
  ariaLabel,
  className,
  testId,
  memoryKey,
  trailingHidden,
}: ChipRowProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<T, HTMLButtonElement>());
  const hasRevealedRef = useRef(false);

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (memoryKey === undefined || scroller === null) {
      return;
    }
    chipRowMemory.set(memoryKey, {
      scrollLeft: scroller.scrollLeft,
      focusKey: chipRowMemory.get(memoryKey)?.focusKey ?? null,
    });
  };

  useLayoutEffect(() => {
    const isMount = !hasRevealedRef.current;
    hasRevealedRef.current = true;
    const scroller = scrollerRef.current;

    let resumed = false;
    if (isMount && memoryKey !== undefined && scroller !== null) {
      const remembered = chipRowMemory.get(memoryKey);
      if (remembered !== undefined) {
        scroller.scrollLeft = remembered.scrollLeft;
        resumed = true;
        chipRowMemory.set(memoryKey, { scrollLeft: remembered.scrollLeft, focusKey: null });
        const active = document.activeElement;
        if (
          selectedKey !== null &&
          remembered.focusKey === selectedKey &&
          (active === null || active === document.body)
        ) {
          chipRefs.current.get(selectedKey)?.focus({ preventScroll: true });
        }
      }
    }
    const animated = !isMount || resumed;

    if (selectedKey === null) {
      return;
    }
    const chip = chipRefs.current.get(selectedKey);
    if (scroller === null || chip === undefined || chip.getClientRects().length === 0) {
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap);
    const edgeInset = Number.isNaN(gap) ? 0 : gap;

    const offset = getChipRevealOffset({
      chipX: chipRect.left - scrollerRect.left + scroller.scrollLeft,
      chipWidth: chipRect.width,
      scrollX: scroller.scrollLeft,
      viewportWidth: scroller.clientWidth,
      contentWidth: scroller.scrollWidth,
      edgeInset,
    });
    if (offset === null) {
      return;
    }

    scroller.scrollTo({
      left: offset,
      behavior: animated && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
  }, [selectedKey]);

  return (
    <div className={classNames(styles.chipRow, className)} data-testid={testId}>
      <HorizontalDragScroller className={styles.scroller} ref={scrollerRef} onScroll={onScroll}>
        <div
          role="group"
          aria-label={ariaLabel}
          className={styles.items}
          data-testid={testId !== undefined ? `${testId}-items` : undefined}
        >
          {items.map((item) => {
            const isSelected = item.key === selectedKey;
            return (
              <Chip
                key={item.key}
                ref={(node) => {
                  if (node === null) {
                    chipRefs.current.delete(item.key);
                  } else {
                    chipRefs.current.set(item.key, node);
                  }
                }}
                variant="pill"
                selected={isSelected}
                pressed={isSelected}
                onClick={(event) => {
                  if (memoryKey !== undefined) {
                    chipRowMemory.set(memoryKey, {
                      scrollLeft: scrollerRef.current?.scrollLeft ?? 0,
                      focusKey: document.activeElement === event.currentTarget ? item.key : null,
                    });
                  }
                  onSelect(item.key);
                }}
                data-testid={testId !== undefined ? `${testId}-${item.key}` : undefined}
                {...(item.hideDesktop === true ? { 'data-hide-desktop': 'true' } : {})}
              >
                {item.label}
              </Chip>
            );
          })}
        </div>
        {trailing ? (
          <div
            className={classNames(
              styles.trailing,
              trailingHidden === true && styles.trailingHidden
            )}
            data-testid={testId !== undefined ? `${testId}-trailing` : undefined}
            inert={trailingHidden === true}
          >
            {trailing}
          </div>
        ) : null}
      </HorizontalDragScroller>
    </div>
  );
}
