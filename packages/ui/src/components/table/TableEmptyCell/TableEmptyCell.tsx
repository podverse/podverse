import classNames from 'classnames';
import type { ReactNode, TdHTMLAttributes } from 'react';

import { Table } from '../Table/Table';

import styles from './TableEmptyCell.module.scss';

export type TableEmptyCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

export function TableEmptyCell({ children, className, ...rest }: TableEmptyCellProps) {
  return (
    <Table.Cell className={classNames(styles.cell, className)} {...rest}>
      {children}
    </Table.Cell>
  );
}
