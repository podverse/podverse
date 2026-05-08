'use client';

import { useCallback } from 'react';
import { FaFilter } from 'react-icons/fa';

import { PopoverIcon } from '../../feedback/PopoverIcon/PopoverIcon';
import { Checkbox } from '../../form/Checkbox/Checkbox';
import { TextInput } from '../../form/TextInput/TextInput';

import styles from './TableFilterBar.module.scss';

export type TableFilterBarColumn = {
  id: string;
  label: string;
  /** API sort field when different from column id. */
  sortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
};

export type TableFilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  columns: TableFilterBarColumn[];
  selectedColumnIds: string[];
  onSelectedColumnIdsChange: (ids: string[]) => void;
  searchPlaceholder: string;
  filterColumnsLabel: string;
  funnelAriaLabel: string;
};

export function TableFilterBar({
  searchValue,
  onSearchChange,
  columns,
  selectedColumnIds,
  onSelectedColumnIdsChange,
  searchPlaceholder,
  filterColumnsLabel,
  funnelAriaLabel,
}: TableFilterBarProps) {
  const handleToggleColumn = useCallback(
    (id: string) => {
      const set = new Set(selectedColumnIds);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      const next = Array.from(set);
      if (next.length > 0) {
        onSelectedColumnIdsChange(next);
      }
    },
    [onSelectedColumnIdsChange, selectedColumnIds]
  );

  const funnelBody = (
    <div className={styles.popoverBody}>
      <p className={styles.popoverTitle}>{filterColumnsLabel}</p>
      {columns.map((col) => {
        const checked = selectedColumnIds.includes(col.id);
        return (
          <label key={col.id} className={styles.checkboxRow}>
            <Checkbox
              checked={checked}
              onChange={() => {
                handleToggleColumn(col.id);
              }}
            />
            <span className={styles.checkboxLabel}>{col.label}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className={styles.root}>
      <div className={styles.searchWrap}>
        <TextInput
          aria-label={searchPlaceholder}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          placeholder={searchPlaceholder}
          type="search"
          value={searchValue}
        />
      </div>
      <div className={styles.funnelWrap}>
        <PopoverIcon
          ariaLabel={funnelAriaLabel}
          body={funnelBody}
          icon={<FaFilter aria-hidden />}
          interaction="click"
        />
      </div>
    </div>
  );
}
