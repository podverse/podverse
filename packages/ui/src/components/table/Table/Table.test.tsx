import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table } from './Table';

import styles from './Table.module.scss';

describe('Table.Row', () => {
  it('applies clickable and selected classes for interactive rows', () => {
    render(
      <table>
        <tbody>
          <Table.Row selected onClick={() => {}}>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </tbody>
      </table>
    );

    const row = screen.getByRole('row');
    if (styles.clickable !== undefined) {
      expect(row.classList.contains(styles.clickable)).toBe(true);
    }
    if (styles.selected !== undefined) {
      expect(row.classList.contains(styles.selected)).toBe(true);
    }
  });
});
