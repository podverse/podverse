import type { TableWithFilterColumn } from '../TableWithFilter/TableWithFilter';
import type { TableWithSortColumn } from '../TableWithSort/TableWithSort';

/**
 * Columns passed to {@link TableFilterBar}: optional subset by id, excluding internal `__` ids.
 */
export function computeFilterBarColumns(
  columns: TableWithFilterColumn[],
  filterableColumnIds?: string[]
): TableWithFilterColumn[] {
  let fc =
    filterableColumnIds !== undefined && filterableColumnIds.length > 0
      ? columns.filter((c) => filterableColumnIds.includes(c.id))
      : columns;
  fc = fc.filter((c) => !c.id.startsWith('__'));
  return fc;
}

/**
 * Maps declarative {@link TableWithFilterColumn} definitions to {@link TableWithSort} column config.
 * Does not prepend bulk-select or other injected columns — compose after this helper if needed.
 */
export function tableWithFilterColumnsToSortColumns(
  columns: TableWithFilterColumn[],
  sortableColumnIds?: string[]
): TableWithSortColumn[] {
  return columns.map((c) => ({
    defaultSortOrder: c.defaultSortOrder,
    header: c.header,
    key: c.id,
    sortAriaLabel: c.sortAriaLabel,
    sortKey: c.sortKey,
    sortable:
      sortableColumnIds === undefined ? c.sortable !== false : sortableColumnIds.includes(c.id),
  }));
}
