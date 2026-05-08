import { describe, expect, it } from 'vitest';

import type { TableWithFilterColumn } from '../TableWithFilter/TableWithFilter';
import {
  computeFilterBarColumns,
  tableWithFilterColumnsToSortColumns,
} from './tableWithFilterColumnHelpers';

describe('tableWithFilterColumnsToSortColumns', () => {
  const columns: TableWithFilterColumn[] = [
    {
      defaultSortOrder: 'desc',
      header: 'Title',
      id: 'title',
      label: 'Title',
      sortAriaLabel: 'Sort by title',
      sortKey: 'sort_title',
      sortable: true,
    },
    {
      header: 'Meta',
      id: 'meta',
      label: 'Meta',
      sortable: false,
    },
  ];

  it('maps columns to sort columns with sort metadata when no sortableColumnIds', () => {
    const out = tableWithFilterColumnsToSortColumns(columns, undefined);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      defaultSortOrder: 'desc',
      key: 'title',
      sortAriaLabel: 'Sort by title',
      sortKey: 'sort_title',
      sortable: true,
    });
    expect(out[1]).toMatchObject({
      key: 'meta',
      sortable: false,
    });
  });

  it('restricts sortable to sortableColumnIds when provided', () => {
    const out = tableWithFilterColumnsToSortColumns(columns, ['title']);
    expect(out[0]?.sortable).toBe(true);
    expect(out[1]?.sortable).toBe(false);
  });

  it('is identity on keys for a simple list', () => {
    const out = tableWithFilterColumnsToSortColumns(columns, undefined);
    expect(out.map((c) => c.key)).toEqual(columns.map((c) => c.id));
  });
});

describe('computeFilterBarColumns', () => {
  const columns: TableWithFilterColumn[] = [
    { header: 'A', id: 'a', label: 'A' },
    { header: 'B', id: 'b', label: 'B' },
    { header: 'Internal', id: '__x', label: 'X' },
  ];

  it('returns all non-__ columns when filterableColumnIds is omitted', () => {
    const out = computeFilterBarColumns(columns, undefined);
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('filters by filterableColumnIds and drops __ ids', () => {
    const out = computeFilterBarColumns(
      [...columns, { header: 'C', id: 'c', label: 'C' }],
      ['b', 'c']
    );
    expect(out.map((c) => c.id)).toEqual(['b', 'c']);
  });
});
