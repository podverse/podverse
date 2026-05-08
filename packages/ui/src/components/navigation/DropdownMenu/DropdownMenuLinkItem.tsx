'use client';

import classNames from 'classnames';
import type { ComponentType, MouseEvent, ReactNode } from 'react';
import { useContext } from 'react';

import { DropdownMenuContext } from './DropdownMenuContext';

import styles from './DropdownMenu.module.scss';

export type DropdownMenuLinkComponentProps = {
  'aria-selected'?: boolean;
  children: ReactNode;
  className?: string;
  href: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  role?: 'menuitem';
};

export type DropdownMenuLinkItemProps = {
  LinkComponent?: ComponentType<DropdownMenuLinkComponentProps>;
  children: ReactNode;
  className?: string;
  focusedIndex?: number;
  href: string;
  menuIndex?: number;
  setFocusedIndex?: (index: number) => void;
};

function DefaultDropdownMenuLink({
  'aria-selected': ariaSelected,
  children,
  className,
  href,
  onClick,
  role,
}: DropdownMenuLinkComponentProps) {
  return (
    <a aria-selected={ariaSelected} className={className} href={href} role={role} onClick={onClick}>
      {children}
    </a>
  );
}

export function DropdownMenuLinkItem({
  LinkComponent = DefaultDropdownMenuLink,
  children,
  className,
  focusedIndex,
  href,
  menuIndex = 0,
  setFocusedIndex,
}: DropdownMenuLinkItemProps) {
  const ctx = useContext(DropdownMenuContext);

  return (
    <li className={styles.menuRow} onMouseEnter={() => setFocusedIndex?.(menuIndex)}>
      <LinkComponent
        aria-selected={focusedIndex === menuIndex}
        className={classNames(styles.itemLink, className)}
        href={href}
        role="menuitem"
        onClick={() => {
          ctx?.close();
        }}
      >
        {children}
      </LinkComponent>
    </li>
  );
}
