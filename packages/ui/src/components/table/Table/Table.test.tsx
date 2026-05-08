import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Table } from './Table';

import styles from './Table.module.scss';

describe('Table.SortableHeaderCell', () => {
  it('invokes onSort when the button is activated', () => {
    const onSort = vi.fn();
    render(
      <table data-testid="sortable-table">
        <Table.Head>
          <Table.Row>
            <Table.SortableHeaderCell
              ariaLabel="Sort by title"
              sortActive={false}
              sortDirection={null}
              onSort={onSort}
            >
              Title
            </Table.SortableHeaderCell>
          </Table.Row>
        </Table.Head>
      </table>
    );

    const table = screen.getByTestId('sortable-table');
    fireEvent.click(within(table).getByRole('button', { name: 'Sort by title' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('exposes ascending aria-sort when active', () => {
    const { container } = render(
      <table>
        <Table.Head>
          <Table.Row>
            <Table.SortableHeaderCell
              ariaLabel="Sort"
              sortActive
              sortDirection="asc"
              onSort={() => {}}
            >
              Name
            </Table.SortableHeaderCell>
          </Table.Row>
        </Table.Head>
      </table>
    );

    const th = container.querySelector('[aria-sort="ascending"]');
    expect(th).not.toBeNull();
  });

  it('exposes descending aria-sort when active', () => {
    const { container } = render(
      <table>
        <Table.Head>
          <Table.Row>
            <Table.SortableHeaderCell
              ariaLabel="Sort"
              sortActive
              sortDirection="desc"
              onSort={() => {}}
            >
              Name
            </Table.SortableHeaderCell>
          </Table.Row>
        </Table.Head>
      </table>
    );

    const th = container.querySelector('[aria-sort="descending"]');
    expect(th).not.toBeNull();
  });
});

describe('Table.Row', () => {
  it('applies clickable and selected classes for interactive rows', () => {
    render(
      <table data-testid="row-table">
        <tbody>
          <Table.Row selected onClick={() => {}}>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </tbody>
      </table>
    );

    const row = within(screen.getByTestId('row-table')).getByRole('row');
    if (styles.clickable !== undefined) {
      expect(row.classList.contains(styles.clickable)).toBe(true);
    }
    if (styles.selected !== undefined) {
      expect(row.classList.contains(styles.selected)).toBe(true);
    }
  });
});
