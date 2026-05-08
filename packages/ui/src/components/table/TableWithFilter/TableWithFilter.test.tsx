import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Table } from '../Table/Table';
import { TableWithFilter } from './TableWithFilter';

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
});
