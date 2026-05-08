import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Table } from '../Table/Table';
import { TableWithFilter } from './TableWithFilter';

afterEach(() => {
  cleanup();
});

describe('TableWithFilter', () => {
  it('renders empty message when there are no rows', () => {
    render(
      <TableWithFilter
        columns={[
          {
            header: 'A',
            id: 'a',
            label: 'A',
          },
        ]}
        emptyMessage="Nothing here"
        filter={{
          handleColumnSelectionChange: vi.fn(),
          search: '',
          selectedColumnIds: ['a'],
          setSearch: vi.fn(),
        }}
        getRowKey={(row: { id: string }) => row.id}
        labels={{
          filterColumnsLabel: 'Columns',
          funnelAriaLabel: 'Filter columns',
          searchPlaceholder: 'Search',
        }}
        onSortChange={vi.fn()}
        renderCells={() => <Table.Cell>x</Table.Cell>}
        rows={[]}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.getByText('Nothing here').textContent).toContain('Nothing here');
    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Nothing here');
  });

  it('omits pagination when paginationMode is none', () => {
    render(
      <TableWithFilter
        columns={[
          {
            header: 'A',
            id: 'a',
            label: 'A',
          },
        ]}
        filter={{
          handleColumnSelectionChange: vi.fn(),
          search: '',
          selectedColumnIds: ['a'],
          setSearch: vi.fn(),
        }}
        getRowKey={(row: { id: string }) => row.id}
        labels={{
          filterColumnsLabel: 'Columns',
          funnelAriaLabel: 'Filter columns',
          searchPlaceholder: 'Search',
        }}
        onSortChange={vi.fn()}
        pagination={{
          currentPage: 2,
          nextLabel: 'Next',
          onPageChange: vi.fn(),
          pageIndicatorLabel: 'Page 2',
          prevLabel: 'Prev',
          totalPages: 5,
        }}
        paginationMode="none"
        renderCells={() => <Table.Cell>x</Table.Cell>}
        rows={[{ id: '1' }]}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.queryByText('Prev')).toBeNull();
  });

  it('renders bodyRender instead of default table body when provided', () => {
    const filter = {
      handleColumnSelectionChange: vi.fn(),
      search: '',
      selectedColumnIds: ['a'],
      setSearch: vi.fn(),
    };

    render(
      <TableWithFilter
        bodyRender={() => <div data-testid="custom-body">Custom section</div>}
        columns={[
          {
            header: 'A',
            id: 'a',
            label: 'A',
          },
        ]}
        filter={filter}
        labels={{
          filterColumnsLabel: 'Columns',
          funnelAriaLabel: 'Filter columns',
          searchPlaceholder: 'Search',
        }}
        onSortChange={vi.fn()}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.getByTestId('custom-body').textContent).toContain('Custom section');
  });

  it('hides filter bar and pagination when system-empty emptyState is used with no rows', () => {
    render(
      <TableWithFilter
        columns={[
          {
            header: 'A',
            id: 'a',
            label: 'A',
          },
        ]}
        emptyState={{
          message: 'No data yet',
          mode: 'system-empty',
        }}
        filter={{
          handleColumnSelectionChange: vi.fn(),
          search: '',
          selectedColumnIds: ['a'],
          setSearch: vi.fn(),
        }}
        getRowKey={(row: { id: string }) => row.id}
        labels={{
          filterColumnsLabel: 'Columns',
          funnelAriaLabel: 'Filter columns',
          searchPlaceholder: 'Search',
        }}
        onSortChange={vi.fn()}
        pagination={{
          currentPage: 2,
          nextLabel: 'Next',
          onPageChange: vi.fn(),
          pageIndicatorLabel: 'Page 2',
          prevLabel: 'Prev',
          totalPages: 5,
        }}
        renderCells={() => <Table.Cell>x</Table.Cell>}
        rows={[]}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.getByText('No data yet').textContent).toContain('No data yet');
    expect(screen.queryByPlaceholderText('Search')).toBeNull();
    expect(screen.queryByText('Prev')).toBeNull();
  });

  it('keeps filter bar when filtered-empty emptyState is used with no rows', () => {
    render(
      <TableWithFilter
        columns={[
          {
            header: 'A',
            id: 'a',
            label: 'A',
          },
        ]}
        emptyState={{
          message: 'No matches',
          mode: 'filtered-empty',
        }}
        filter={{
          handleColumnSelectionChange: vi.fn(),
          search: '',
          selectedColumnIds: ['a'],
          setSearch: vi.fn(),
        }}
        getRowKey={(row: { id: string }) => row.id}
        labels={{
          filterColumnsLabel: 'Columns',
          funnelAriaLabel: 'Filter columns',
          searchPlaceholder: 'Search',
        }}
        onSortChange={vi.fn()}
        renderCells={() => <Table.Cell>x</Table.Cell>}
        rows={[]}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.getByPlaceholderText('Search')).toBeTruthy();
    expect(screen.getByText('No matches')).toBeTruthy();
  });
});
