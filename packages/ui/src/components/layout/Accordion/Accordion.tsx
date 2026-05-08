'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa6';

import styles from './Accordion.module.scss';

export type AccordionProps = {
  header: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  color?: 'primary' | 'secondary' | 'link';
  size?: 'small' | 'large';
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** When set, the accordion is controlled. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
};

export function Accordion({
  header,
  children,
  className,
  headerClassName,
  contentClassName,
  color = 'primary',
  size = 'large',
  defaultOpen = false,
  open,
  onToggle,
}: AccordionProps) {
  const controlled = open !== undefined;

  const uncontrolledProps =
    defaultOpen === true
      ? {
          defaultOpen: true,
        }
      : {};

  return (
    <details
      className={classNames(styles.accordion, styles[color], styles[size], className)}
      {...(controlled
        ? {
            open,
            onToggle: (event) => {
              onToggle?.(event.currentTarget.open);
            },
          }
        : uncontrolledProps)}
    >
      <summary className={classNames(styles.accordionHeader, headerClassName)}>
        <span className={classNames(styles.headerIcon, styles[color])}>
          <FaChevronRight />
        </span>
        {header}
      </summary>
      <div className={classNames(styles.accordionContent, contentClassName)}>{children}</div>
    </details>
  );
}
