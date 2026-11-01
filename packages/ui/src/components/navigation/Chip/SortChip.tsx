'use client';

import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { useDropdownKeyboardNavigation } from '../../../hooks/useDropdownKeyboardNavigation';
import type { DropdownMenuPanelItem } from '../DropdownMenu/DropdownMenuPanel';
import { DropdownMenuPanel } from '../DropdownMenu/DropdownMenuPanel';
import { Chip } from './Chip';

import styles from './Chip.module.scss';

export type SortChipOption<T extends string> = { value: T; label: string };
export type SortChipRangeOption<T extends string> = {
  value: T;
  label: string;
  /** Face text when shorter than the menu row. Defaults to `label`. */
  shortLabel?: string;
};
export type SortChipRange<TSort extends string, TRange extends string> = {
  /** The sort option that takes a range, e.g. 'top'. */
  sort: TSort;
  /** Accessible name of the range menu, e.g. "Range". */
  heading: string;
  options: readonly SortChipRangeOption<TRange>[];
  /** Current range; `null` while another sort is selected. */
  value: TRange | null;
};
export type SortChipProps<TSort extends string, TRange extends string> = {
  /** e.g. "Sort". Accessible name is `${heading}: ${faceLabel}`; also the sort menu's name. */
  heading: string;
  options: readonly SortChipOption<TSort>[];
  value: TSort;
  /** `range` is non-null exactly when `sort === range.sort`. */
  onChange: (sort: TSort, range: TRange | null) => void;
  range?: SortChipRange<TSort, TRange>;
  /** Which chip edge the menu lines up with. Default 'left'. */
  position?: 'left' | 'right';
  testId?: string;
};

type SortChipStep = 'sort' | 'range';

function SortChipStaticFace({
  accessibleName,
  faceLabel,
  testId,
}: {
  accessibleName: string;
  faceLabel: string;
  testId?: string;
}) {
  return (
    <div className={styles.menuWrapper}>
      <span
        aria-label={accessibleName}
        className={classNames(styles.chip, styles.filter, styles.selected, styles.staticFace)}
        data-testid={testId !== undefined ? `${testId}-button` : undefined}
      >
        {faceLabel}
      </span>
    </div>
  );
}

/**
 * One chip for the list order. The face is the current sort, or the range while the
 * range-bearing sort is selected and a range is set. When that sort is selected and
 * `range.value` is null, the face stays the sort label. Choosing that sort swaps the open menu
 * to the range options, and `onChange` fires only once a range is chosen. When `options` is
 * exactly the range sort, every open starts on the range list. A single non-range option keeps
 * the face with no caret and no menu, so the current order stays visible.
 */
export function SortChip<TSort extends string, TRange extends string>({
  heading,
  options,
  value,
  onChange,
  range,
  position = 'left',
  testId,
}: SortChipProps<TSort, TRange>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const [sortStep, setSortStep] = useState<SortChipStep>('sort');

  const isRangeOnly =
    range !== undefined && options.length === 1 && options[0]?.value === range.sort;
  /** One fixed order with no menu: show the label so the sort is visible, without a caret. */
  const isStaticFace = options.length === 1 && !isRangeOnly;
  const step: SortChipStep = isRangeOnly ? 'range' : sortStep;

  const currentOption = options.find((option) => option.value === value) ?? options[0];
  const currentRangeOption =
    range !== undefined && value === range.sort && range.value !== null
      ? range.options.find((option) => option.value === range.value)
      : undefined;
  const faceLabel =
    currentRangeOption !== undefined
      ? (currentRangeOption.shortLabel ?? currentRangeOption.label)
      : (currentOption?.label ?? '');
  const accessibleName = `${heading}: ${faceLabel}`;

  const sortItems: DropdownMenuPanelItem[] = isStaticFace
    ? []
    : options.map((option) => {
        const optionRange = range !== undefined && option.value === range.sort ? range : undefined;
        return {
          label: option.label,
          checked: option.value === value,
          ...(optionRange !== undefined ? { dismissOnSelect: false } : {}),
          onClick: () => {
            if (optionRange !== undefined) {
              const checkedIndex = optionRange.options.findIndex(
                (rangeOption) =>
                  value === optionRange.sort && rangeOption.value === optionRange.value
              );
              const focusIndex = checkedIndex >= 0 ? checkedIndex : 0;
              pendingFocusIndexRef.current = focusIndex;
              setFocusedIndex(focusIndex);
              setSortStep('range');
              return;
            }
            if (option.value !== value) {
              onChange(option.value, null);
            }
          },
        };
      });

  const rangeItems: DropdownMenuPanelItem[] = [];
  if (!isStaticFace && range !== undefined) {
    const { sort: rangeSort, value: rangeValue } = range;
    for (const option of range.options) {
      rangeItems.push({
        label: option.label,
        checked: value === rangeSort && option.value === rangeValue,
        onClick: () => {
          if (value !== rangeSort || option.value !== rangeValue) {
            onChange(rangeSort, option.value);
          }
        },
      });
    }
  }

  const menuItems = step === 'range' ? rangeItems : sortItems;

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: menuItems.length,
      closeOnItemSelect: false,
      onItemSelect: (idx) => {
        const item = menuItems[idx];
        if (item === undefined) {
          return;
        }
        item.onClick();
        if (item.dismissOnSelect !== false) {
          setOpen(false);
        }
      },
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
    });

  useEffect(() => {
    if (!open) {
      pendingFocusIndexRef.current = null;
      setSortStep('sort');
    }
  }, [open]);

  useEffect(() => {
    const focusIndex = pendingFocusIndexRef.current;
    if (!open || step !== 'range' || focusIndex === null) {
      return;
    }
    pendingFocusIndexRef.current = null;
    const row = menuRef.current?.children.item(focusIndex);
    if (row instanceof HTMLElement) {
      row.focus();
    }
  }, [open, step]);

  if (isStaticFace) {
    return (
      <SortChipStaticFace accessibleName={accessibleName} faceLabel={faceLabel} testId={testId} />
    );
  }

  return (
    <div className={styles.menuWrapper}>
      <Chip
        ref={buttonRef}
        variant="filter"
        selected
        menuExpanded={open}
        aria-label={accessibleName}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleButtonKeyDown}
        data-testid={testId !== undefined ? `${testId}-button` : undefined}
      >
        {faceLabel}
      </Chip>
      <DropdownMenuPanel
        menuItems={menuItems}
        open={open}
        menuRef={menuRef}
        focusedIndex={focusedIndex}
        setFocusedIndex={setFocusedIndex}
        handleMenuKeyDown={handleMenuKeyDown}
        setOpen={setOpen}
        position={position}
        ariaLabel={step === 'range' && range !== undefined ? range.heading : heading}
        anchorRef={buttonRef}
      />
    </div>
  );
}
