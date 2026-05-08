import classNames from 'classnames';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import {
  TableIconActionLink,
  TableIconDeleteButton,
  TableIconEditLink,
  TableIconViewLink,
} from './TableIconActions';
import { TableSortableHeaderCell } from './TableSortableHeaderCell';

import styles from './Table.module.scss';

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

function TableComponent({ children, className }: TableProps) {
  return <table className={`${styles.root}${className ? ` ${className}` : ''}`}>{children}</table>;
}

function Head({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

type RowProps = Omit<HTMLAttributes<HTMLTableRowElement>, 'children'> & {
  children: ReactNode;
  selected?: boolean;
};

function Row({ children, className, onClick, selected = false, ...rest }: RowProps) {
  return (
    <tr
      className={classNames(
        styles.row,
        onClick !== undefined ? styles.clickable : null,
        selected ? styles.selected : null,
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </tr>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th scope="col">{children}</th>;
}

type SelectHeaderCellProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, 'scope'> & {
  children?: ReactNode;
};

function SelectHeaderCell({ children, className, ...rest }: SelectHeaderCellProps) {
  return (
    <th className={classNames(styles.selectCell, className)} scope="col" {...rest}>
      {children}
    </th>
  );
}

type CellProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, 'children'> & {
  children?: ReactNode;
};

function Cell({ children, className, ...rest }: CellProps) {
  return (
    <td className={classNames(styles.cell, className)} {...rest}>
      {children}
    </td>
  );
}

type SelectCellProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, 'children'> & {
  children?: ReactNode;
};

function SelectCell({ children, className, ...rest }: SelectCellProps) {
  return (
    <td className={classNames(styles.cell, styles.selectCell, className)} {...rest}>
      {children}
    </td>
  );
}

type RowActionsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

function RowActions({ children, className, ...rest }: RowActionsProps) {
  return (
    <div className={classNames(styles.rowActions, className)} {...rest}>
      {children}
    </div>
  );
}

function ScrollContainer({ children }: { children: React.ReactNode }) {
  return <div className={styles.scrollContainer}>{children}</div>;
}

export const Table = Object.assign(TableComponent, {
  Head,
  Body,
  Row,
  HeaderCell,
  SortableHeaderCell: TableSortableHeaderCell,
  SelectHeaderCell,
  Cell,
  SelectCell,
  RowActions,
  ScrollContainer,
  IconActionLink: TableIconActionLink,
  IconViewLink: TableIconViewLink,
  IconEditLink: TableIconEditLink,
  IconDeleteButton: TableIconDeleteButton,
});

export type {
  CellProps,
  RowProps,
  RowActionsProps,
  SelectCellProps,
  SelectHeaderCellProps,
  TableProps,
};
export type {
  TableSortableHeaderCellProps,
  TableSortableHeaderSortDirection,
} from './TableSortableHeaderCell';
