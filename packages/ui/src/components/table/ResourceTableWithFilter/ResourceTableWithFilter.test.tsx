import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { IconButtonLinkComponentProps } from '../../button/IconButton/IconButton';
import { Table } from '../Table/Table';
import { ResourceTableWithFilter } from './ResourceTableWithFilter';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

function StubLink(props: IconButtonLinkComponentProps) {
  return (
    <a aria-label={props['aria-label']} href={props.href ?? '#'}>
      {props.children}
    </a>
  );
}

describe('ResourceTableWithFilter', () => {
  it('renders view icon link when actions and row policy allow', () => {
    render(
      <ResourceTableWithFilter
        actions={{
          LinkComponent: StubLink,
          labels: { delete: 'Del', edit: 'Edit', view: 'View' },
          viewHref: () => '/v/1',
        }}
        columns={[
          {
            header: 'Name',
            id: 'name',
            label: 'Name',
          },
        ]}
        currentQueryParams={{}}
        deleteConfirm={{
          cancelLabel: 'Cancel',
          closeButtonAriaLabel: 'Close',
          confirmLabel: 'OK',
          message: () => 'Sure?',
          modalAriaLabel: 'Confirm',
        }}
        getRowKey={(row) => row.id}
        initialColumns={['name']}
        initialSearch=""
        labels={{
          actionsColumn: 'Actions',
          filterColumnsLabel: 'Cols',
          funnelAriaLabel: 'Funnel',
          searchPlaceholder: 'Search',
        }}
        basePath="/items"
        onSortChange={vi.fn()}
        renderCells={(row) => <TableCells row={row} />}
        rows={[{ id: '1', name: 'Ada' }]}
        sortBy={undefined}
        sortOrder="asc"
      />
    );

    expect(screen.getByRole('link', { name: 'View' }).getAttribute('href')).toBe('/v/1');
  });
});

function TableCells(props: { row: { id: string; name: string } }) {
  return <Table.Cell>{props.row.name}</Table.Cell>;
}
