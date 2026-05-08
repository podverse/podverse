import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mergeSortPrefsInBrowserCookie } from '../../../lib/cookies/browserCookies';
import { Table } from '../Table/Table';
import { TableWithSort } from './TableWithSort';

vi.mock('../../../lib/cookies/browserCookies', () => ({
  mergeSortPrefsInBrowserCookie: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('TableWithSort', () => {
  it('activates default ascending order for an unsorted column', () => {
    const onSortChange = vi.fn();
    render(
      <TableWithSort
        columns={[
          {
            header: 'Name',
            key: 'name',
            sortable: true,
          },
        ]}
        onSortChange={onSortChange}
        sortBy={undefined}
        sortOrder="asc"
      >
        <Table.Body>{null}</Table.Body>
      </TableWithSort>
    );

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('toggles to descending when the active column header is activated again', () => {
    const onSortChange = vi.fn();
    render(
      <TableWithSort
        columns={[
          {
            header: 'Name',
            key: 'name',
            sortable: true,
          },
        ]}
        onSortChange={onSortChange}
        sortBy="name"
        sortOrder="asc"
      >
        <Table.Body>{null}</Table.Body>
      </TableWithSort>
    );

    fireEvent.click(screen.getByRole('button', { name: /sort by name/i }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('writes sort prefs cookie when cookie props are set', () => {
    const onSortChange = vi.fn();
    render(
      <TableWithSort
        columns={[
          {
            header: 'Email',
            key: 'email',
            sortable: true,
          },
        ]}
        onSortChange={onSortChange}
        sortBy={undefined}
        sortOrder="asc"
        sortPrefsCookieName="prefs"
        sortPrefsListKey="users"
      >
        <Table.Body>{null}</Table.Body>
      </TableWithSort>
    );

    fireEvent.click(screen.getByRole('button', { name: /sort by email/i }));
    expect(mergeSortPrefsInBrowserCookie).toHaveBeenCalledWith(
      'prefs',
      'users',
      expect.objectContaining({ sortBy: 'email' })
    );
  });
});
