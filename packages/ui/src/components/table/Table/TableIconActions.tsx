import type { ComponentType, ReactNode } from 'react';
import { FaEye, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';

import type { IconButtonLinkComponentProps } from '../../button/IconButton/IconButton';
import { IconButton } from '../../button/IconButton/IconButton';

export type TableIconActionLinkProps = {
  href: string;
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
  LinkComponent: ComponentType<IconButtonLinkComponentProps>;
  children: ReactNode;
};

/**
 * Generic bordered icon link for table row actions (management-style `IconButton` + `Table.RowActions`).
 */
export function TableIconActionLink({
  href,
  ariaLabel,
  disabled,
  title,
  LinkComponent,
  children,
}: TableIconActionLinkProps) {
  return (
    <IconButton
      aria-label={ariaLabel}
      disabled={disabled}
      href={href}
      LinkComponent={LinkComponent}
      title={title}
    >
      {children}
    </IconButton>
  );
}

export type TableIconViewLinkProps = Omit<TableIconActionLinkProps, 'children'>;

export function TableIconViewLink(props: TableIconViewLinkProps) {
  return (
    <TableIconActionLink {...props}>
      <FaEye aria-hidden />
    </TableIconActionLink>
  );
}

export type TableIconEditLinkProps = Omit<TableIconActionLinkProps, 'children'>;

export function TableIconEditLink(props: TableIconEditLinkProps) {
  return (
    <TableIconActionLink {...props}>
      <FaPenToSquare aria-hidden />
    </TableIconActionLink>
  );
}

export type TableIconDeleteButtonProps = {
  ariaLabel: string;
  title?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
};

export function TableIconDeleteButton({
  ariaLabel,
  title,
  disabled,
  isLoading,
  onClick,
}: TableIconDeleteButtonProps) {
  return (
    <IconButton
      aria-label={ariaLabel}
      disabled={disabled}
      isLoading={isLoading}
      title={title}
      variant="danger"
      onClick={onClick}
    >
      <FaTrashCan aria-hidden />
    </IconButton>
  );
}
