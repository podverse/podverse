'use client';

import type { ComponentType } from 'react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo } from 'react';

import { useDeleteModal } from '../../../hooks/useDeleteModal';
import { useTableFilterState } from '../../../hooks/useTableFilterState';
import type { SortDirection } from '../../../lib/cookies/sortPrefsCookie';
import type { IconButtonLinkComponentProps } from '../../button/IconButton/IconButton';
import { DeleteConfirmModalShell } from '../../layout/DeleteConfirmModalShell/DeleteConfirmModalShell';
import { Disclosure } from '../../layout/Disclosure/Disclosure';
import { CursorPagination } from '../../navigation/CursorPagination/CursorPagination';
import { BulkActionBar } from '../BulkActionBar/BulkActionBar';
import { Table } from '../Table/Table';
import { tableWithFilterColumnsToSortColumns } from '../Table/tableWithFilterColumnHelpers';
import type {
  TableWithFilterColumn,
  TableWithFilterEmptyState,
  TableWithFilterPaginationLabels,
  TableWithFilterProps,
} from '../TableWithFilter/TableWithFilter';
import { TableWithFilter } from '../TableWithFilter/TableWithFilter';
import { TableWithSort } from '../TableWithSort/TableWithSort';

import styles from './ResourceTableWithFilter.module.scss';

export type ResourceRowActionState = 'disabled' | 'enabled' | 'hidden';

export type ResourceRowActionsPolicy = {
  delete?: ResourceRowActionState;
  disabledReasons?: {
    delete?: () => string;
    edit?: () => string;
    view?: () => string;
  };
  edit?: ResourceRowActionState;
  view?: ResourceRowActionState;
};

export type ResourceTableActions<TRow> = {
  LinkComponent: ComponentType<IconButtonLinkComponentProps>;
  labels: { delete: string; edit: string; view: string };
  onDelete?: (row: TRow) => Promise<void>;
  editHref?: (row: TRow) => string | undefined;
  viewHref?: (row: TRow) => string | undefined;
};

export type ResourceTableBulkSelect = {
  ariaLabels: { selectAll: string; selectRow: string };
  onSelectionChange: (keys: string[]) => void;
  selectedKeys: string[];
  toolbarActions?: import('../BulkActionBar/BulkActionBar').BulkActionBarAction[];
  toolbarClearLabel: string;
  toolbarSelectedSummary: ReactNode;
};

export type ResourceTableCursorPagination = {
  hasNext: boolean;
  hasPrev: boolean;
  isLoading?: boolean;
  nextLabel: string;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  pageLabel: string;
  prevLabel: string;
};

export type ResourceTableDeleteConfirm<TRow> = {
  cancelLabel: string;
  closeButtonAriaLabel: string;
  confirmLabel: string;
  message: (row: TRow) => ReactNode;
  modalAriaLabel: string;
};

export type ResourceTableGroupedSection<TRow> = {
  rows: TRow[];
  sectionKey: string;
  title: ReactNode;
};

export type ResourceTableWithFilterProps<TRow> = {
  actions?: ResourceTableActions<TRow>;
  afterCookieListMutation?: () => Promise<void>;
  allColumnIds?: string[];
  basePath: string;
  /** Ignored when `groupedSections` is set (grouped tables do not render bulk selection yet). */
  bulkSelect?: ResourceTableBulkSelect;
  columns: TableWithFilterColumn[];
  currentQueryParams: Record<string, string>;
  cursorPagination?: ResourceTableCursorPagination;
  deleteConfirm: ResourceTableDeleteConfirm<TRow>;
  emptyMessage?: ReactNode;
  emptyState?: TableWithFilterEmptyState;
  filterableColumnIds?: string[];
  getRowActions?: (row: TRow) => ResourceRowActionsPolicy | undefined;
  getRowKey: (row: TRow) => string;
  groupedSections?: ResourceTableGroupedSection<TRow>[];
  initialColumns: string[];
  initialSearch: string;
  labels: TableWithFilterProps<TRow>['labels'] & { actionsColumn?: ReactNode };
  onRowClick?: (row: TRow, index: number) => void;
  onSortChange: (sortKey: string, order: SortDirection) => void;
  pagination?: TableWithFilterPaginationLabels;
  paginationMode?: 'cursor' | 'none' | 'page';
  renderCells: (row: TRow, index: number) => ReactNode;
  rows: TRow[];
  searchSyncParams?: Record<string, string>;
  selectedRowKey?: string;
  sortBy: string | undefined;
  sortOrder: SortDirection;
  sortPrefsCookieName?: string;
  sortPrefsListKey?: string;
  sortableColumnIds?: string[];
  tableListStateCookieName?: string;
  tableListStateListKey?: string;
  trailingToolbar?: ReactNode;
};

function resolveAction(
  policy: ResourceRowActionsPolicy | undefined,
  key: 'delete' | 'edit' | 'view',
  fallback: ResourceRowActionState
): ResourceRowActionState {
  if (policy === undefined) {
    return fallback;
  }
  const v = policy[key];
  if (v === undefined) {
    return fallback;
  }
  return v;
}

export function ResourceTableWithFilter<TRow>({
  actions,
  afterCookieListMutation,
  allColumnIds,
  basePath,
  bulkSelect,
  columns,
  currentQueryParams,
  cursorPagination,
  deleteConfirm,
  emptyMessage,
  emptyState,
  filterableColumnIds,
  getRowActions,
  getRowKey,
  groupedSections,
  initialColumns,
  initialSearch,
  labels,
  onSortChange,
  pagination,
  paginationMode = 'page',
  onRowClick,
  renderCells,
  rows,
  searchSyncParams,
  selectedRowKey,
  sortBy,
  sortOrder,
  sortPrefsCookieName,
  sortPrefsListKey,
  sortableColumnIds,
  tableListStateCookieName,
  tableListStateListKey,
  trailingToolbar,
}: ResourceTableWithFilterProps<TRow>) {
  const mergedEmptyState: TableWithFilterEmptyState | undefined =
    emptyState ??
    (emptyMessage !== undefined && emptyMessage !== null
      ? { mode: 'filtered-empty', message: emptyMessage }
      : undefined);

  const allIds = useMemo(() => {
    if (allColumnIds !== undefined && allColumnIds.length > 0) {
      return allColumnIds;
    }
    return columns.map((c) => c.id);
  }, [allColumnIds, columns]);

  const filter = useTableFilterState({
    afterCookieListMutation,
    allColumnIds: allIds,
    basePath,
    currentQueryParams,
    initialColumns,
    initialSearch,
    searchSyncParams,
    tableListStateCookieName,
    tableListStateListKey,
  });

  const deleteModal = useDeleteModal<TRow>({
    onDelete: async (row) => {
      if (actions?.onDelete === undefined) {
        return;
      }
      await actions.onDelete(row);
    },
  });

  const rowSamples = useMemo(() => {
    if (groupedSections !== undefined && groupedSections.length > 0) {
      return groupedSections.flatMap((s) => s.rows);
    }
    return rows;
  }, [groupedSections, rows]);

  const defaultActionsOpen =
    actions !== undefined &&
    (actions.viewHref !== undefined ||
      actions.editHref !== undefined ||
      actions.onDelete !== undefined);

  const showActionsColumn = useMemo(() => {
    if (!defaultActionsOpen) {
      return false;
    }
    if (getRowActions === undefined) {
      return true;
    }
    return rowSamples.some((row) => {
      const p = getRowActions(row);
      const v = resolveAction(p, 'view', 'enabled');
      const e = resolveAction(p, 'edit', 'enabled');
      const d = resolveAction(p, 'delete', 'enabled');
      return (
        (actions.viewHref !== undefined && v !== 'hidden') ||
        (actions.editHref !== undefined && e !== 'hidden') ||
        (actions.onDelete !== undefined && d !== 'hidden')
      );
    });
  }, [actions, defaultActionsOpen, getRowActions, rowSamples]);

  const mergedColumns = useMemo(() => {
    const base = [...columns];
    if (showActionsColumn) {
      base.push({
        header: labels.actionsColumn ?? '',
        id: '__actions',
        label: '',
        sortable: false,
      });
    }
    return base;
  }, [columns, labels.actionsColumn, showActionsColumn]);

  const pageResetKey =
    paginationMode === 'page' && pagination !== undefined ? pagination.currentPage : 0;

  // Depend on onSelectionChange only; parents often pass a new bulkSelect object each render when the
  // selected-count summary updates — that must not clear selection.
  useEffect(() => {
    if (bulkSelect === undefined) {
      return;
    }
    bulkSelect.onSelectionChange([]);
  }, [
    bulkSelect?.onSelectionChange,
    filter.search,
    filter.selectedColumnIds,
    pageResetKey,
    sortBy,
    sortOrder,
  ]);

  const renderActions = useCallback(
    (row: TRow) => {
      if (actions === undefined || !showActionsColumn) {
        return null;
      }
      const policy = getRowActions?.(row);
      const viewState = resolveAction(policy, 'view', 'enabled');
      const editState = resolveAction(policy, 'edit', 'enabled');
      const deleteState = resolveAction(policy, 'delete', 'enabled');
      const viewHref = actions.viewHref?.(row);
      const editHref = actions.editHref?.(row);

      return (
        <Table.RowActions>
          {actions.viewHref !== undefined &&
          viewState !== 'hidden' &&
          viewHref !== undefined &&
          viewHref !== '' ? (
            <Table.IconViewLink
              LinkComponent={actions.LinkComponent}
              ariaLabel={actions.labels.view}
              disabled={viewState === 'disabled'}
              href={viewHref}
              title={
                viewState === 'disabled' ? policy?.disabledReasons?.view?.() : actions.labels.view
              }
            />
          ) : null}
          {actions.editHref !== undefined &&
          editState !== 'hidden' &&
          editHref !== undefined &&
          editHref !== '' ? (
            <Table.IconEditLink
              LinkComponent={actions.LinkComponent}
              ariaLabel={actions.labels.edit}
              disabled={editState === 'disabled'}
              href={editHref}
              title={
                editState === 'disabled' ? policy?.disabledReasons?.edit?.() : actions.labels.edit
              }
            />
          ) : null}
          {actions.onDelete !== undefined && deleteState !== 'hidden' ? (
            <Table.IconDeleteButton
              ariaLabel={actions.labels.delete}
              disabled={deleteState === 'disabled'}
              title={
                deleteState === 'disabled'
                  ? policy?.disabledReasons?.delete?.()
                  : actions.labels.delete
              }
              onClick={() => {
                deleteModal.openFor(row);
              }}
            />
          ) : null}
        </Table.RowActions>
      );
    },
    [actions, deleteModal, getRowActions, showActionsColumn]
  );

  const wrapCells = useCallback(
    (row: TRow, index: number) => (
      <>
        {renderCells(row, index)}
        {showActionsColumn ? (
          <Table.Cell className={styles.actionsCell}>{renderActions(row)}</Table.Cell>
        ) : null}
      </>
    ),
    [renderActions, renderCells, showActionsColumn]
  );

  const bulkForTable =
    bulkSelect !== undefined && (groupedSections === undefined || groupedSections.length === 0)
      ? {
          ariaLabels: bulkSelect.ariaLabels,
          getRowKey,
          onSelectionChange: bulkSelect.onSelectionChange,
          selectedKeys: bulkSelect.selectedKeys,
        }
      : undefined;

  const tablePaginationMode =
    paginationMode === 'cursor' || paginationMode === 'none' ? 'none' : 'page';

  const deleteTarget = deleteModal.deleteTarget;

  const sortColumns = useMemo(
    () => tableWithFilterColumnsToSortColumns(mergedColumns, sortableColumnIds),
    [mergedColumns, sortableColumnIds]
  );

  const deleteShell = (
    <DeleteConfirmModalShell
      cancelLabel={deleteConfirm.cancelLabel}
      closeButtonAriaLabel={deleteConfirm.closeButtonAriaLabel}
      confirmLabel={deleteConfirm.confirmLabel}
      isOpen={deleteModal.isOpen}
      isPending={deleteModal.isPending}
      message={deleteTarget !== null ? deleteConfirm.message(deleteTarget) : ''}
      modalAriaLabel={deleteConfirm.modalAriaLabel}
      onCancel={() => {
        deleteModal.close();
      }}
      onConfirm={() => void deleteModal.confirm()}
    />
  );

  const bulkToolbar =
    bulkSelect !== undefined &&
    bulkSelect.selectedKeys.length > 0 &&
    bulkSelect.toolbarActions !== undefined ? (
      <BulkActionBar
        actions={bulkSelect.toolbarActions}
        clearLabel={bulkSelect.toolbarClearLabel}
        onClear={() => {
          bulkSelect.onSelectionChange([]);
        }}
        selectedSummary={bulkSelect.toolbarSelectedSummary}
      />
    ) : null;

  if (groupedSections !== undefined && groupedSections.length > 0) {
    const totalRows = groupedSections.reduce((acc, s) => acc + s.rows.length, 0);
    const groupedEmpty = totalRows === 0;

    const suppressGroupedChrome =
      groupedEmpty &&
      mergedEmptyState !== undefined &&
      mergedEmptyState.mode === 'system-empty' &&
      mergedEmptyState.hideTools !== false;

    return (
      <>
        <TableWithFilter
          bodyRender={() => (
            <>
              {groupedEmpty &&
              mergedEmptyState !== undefined &&
              mergedEmptyState.message !== undefined &&
              mergedEmptyState.message !== null ? (
                <div className={styles.emptyState} role="status">
                  <p className={styles.emptyMessage}>{mergedEmptyState.message}</p>
                </div>
              ) : null}
              {!groupedEmpty
                ? groupedSections.map((section) => (
                    <Disclosure key={section.sectionKey} title={section.title}>
                      <Table.ScrollContainer>
                        <TableWithSort
                          columns={sortColumns}
                          onSortChange={onSortChange}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          sortPrefsCookieName={sortPrefsCookieName}
                          sortPrefsListKey={sortPrefsListKey}
                        >
                          <Table.Body>
                            {section.rows.map((row, index) => (
                              <Table.Row key={getRowKey(row)}>{wrapCells(row, index)}</Table.Row>
                            ))}
                          </Table.Body>
                        </TableWithSort>
                      </Table.ScrollContainer>
                    </Disclosure>
                  ))
                : null}
            </>
          )}
          columns={mergedColumns}
          filter={filter}
          filterableColumnIds={filterableColumnIds}
          labels={labels}
          onSortChange={onSortChange}
          pagination={paginationMode === 'page' ? pagination : undefined}
          paginationMode={tablePaginationMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          sortPrefsCookieName={sortPrefsCookieName}
          sortPrefsListKey={sortPrefsListKey}
          sortableColumnIds={sortableColumnIds}
          suppressToolbar={suppressGroupedChrome}
          trailingToolbar={trailingToolbar}
        />
        {paginationMode === 'cursor' && cursorPagination !== undefined ? (
          <CursorPagination {...cursorPagination} />
        ) : null}
        {bulkToolbar}
        {deleteShell}
      </>
    );
  }

  return (
    <>
      <TableWithFilter
        bulkSelect={bulkForTable}
        columns={mergedColumns}
        emptyState={mergedEmptyState}
        filter={filter}
        filterableColumnIds={filterableColumnIds}
        getRowKey={getRowKey}
        labels={labels}
        onRowClick={onRowClick}
        onSortChange={onSortChange}
        pagination={tablePaginationMode === 'page' ? pagination : undefined}
        paginationMode={tablePaginationMode}
        renderCells={wrapCells}
        rows={rows}
        selectedRowKey={selectedRowKey}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortPrefsCookieName={sortPrefsCookieName}
        sortPrefsListKey={sortPrefsListKey}
        sortableColumnIds={sortableColumnIds}
        trailingToolbar={trailingToolbar}
      />
      {paginationMode === 'cursor' && cursorPagination !== undefined ? (
        <CursorPagination {...cursorPagination} />
      ) : null}
      {bulkToolbar}
      {deleteShell}
    </>
  );
}
